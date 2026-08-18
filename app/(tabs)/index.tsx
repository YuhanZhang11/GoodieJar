import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { JarPage } from '@/components/jar-page';
import { TaskFormModal } from '@/components/task-form-modal';
import { TaskListItem } from '@/components/task-list-item';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Task } from '@/models/types';
import { getTransactionsByDate } from '@/services/coinTransactionService';
import { completeTask } from '@/services/taskCompletionService';
import { createTask, getActiveTasks, type CreateTaskInput } from '@/services/taskService';

type LoadState = 'loading' | 'loaded' | 'error';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The task could not be completed.';
}

function getLocalCalendarDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function TasksScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [balanceRefreshToken, setBalanceRefreshToken] = useState(0);

  const loadTasks = useCallback(async () => {
    setLoadState('loading');

    try {
      const today = getLocalCalendarDate(new Date());
      const [activeTasks, todayTransactions] = await Promise.all([
        getActiveTasks(),
        getTransactionsByDate(today),
      ]);
      const completedTaskIds = new Set(
        todayTransactions
          .filter((transaction) => transaction.type === 'EARN' && transaction.taskId !== null)
          .map((transaction) => transaction.taskId as string)
      );

      setTasks(activeTasks.filter((task) => !completedTaskIds.has(task.id)));
      setLoadState('loaded');
    } catch {
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTasks();
    }, [loadTasks])
  );

  async function addTask(input: CreateTaskInput) {
    const createdTask = await createTask(input);

    setTasks((currentTasks) => [
      createdTask,
      ...currentTasks.filter((task) => task.id !== createdTask.id),
    ]);
    setLoadState('loaded');
    void loadTasks();
  }

  async function completeSelectedTask(task: Task) {
    if (completingTaskId !== null) {
      return;
    }

    setCompletingTaskId(task.id);

    try {
      await completeTask({ taskId: task.id });
      setBalanceRefreshToken((currentToken) => currentToken + 1);
      setTasks((currentTasks) => currentTasks.filter((currentTask) => currentTask.id !== task.id));
    } catch (error) {
      Alert.alert('Could not complete task', getErrorMessage(error));
    } finally {
      setCompletingTaskId(null);
    }
  }

  function renderEmptyState() {
    if (loadState === 'loading') {
      return (
        <View style={styles.messageState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.messageText, { color: colors.mutedText }]}>Loading tasks...</Text>
        </View>
      );
    }

    if (loadState === 'error') {
      return (
        <View style={styles.messageState}>
          <Text style={[styles.messageTitle, { color: colors.text }]}>Tasks unavailable</Text>
          <Text style={[styles.messageText, { color: colors.mutedText }]}>Please try again.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadTasks()}
            style={({ pressed }) => [
              styles.retryButton,
              { borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
            ]}>
            <MaterialIcons name="refresh" size={18} color={colors.primary} />
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.messageState}>
        <Text style={[styles.messageTitle, { color: colors.text }]}>No tasks yet.</Text>
      </View>
    );
  }

  return (
    <JarPage balanceRefreshToken={balanceRefreshToken}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={tasks}
        keyExtractor={(task) => task.id}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          <View style={[styles.sectionHeader, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tasks</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsTaskModalVisible(true)}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: colors.surface, opacity: pressed ? 0.65 : 1 },
              ]}>
              <MaterialIcons name="add" size={19} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Add</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <TaskListItem
            isCompleting={completingTaskId === item.id}
            isDisabled={completingTaskId !== null}
            onComplete={(task) => void completeSelectedTask(task)}
            task={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <TaskFormModal
        onRequestClose={() => setIsTaskModalVisible(false)}
        onSubmit={addTask}
        visible={isTaskModalVisible}
      />
    </JarPage>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: 28,
    paddingHorizontal: 22,
  },
  sectionHeader: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sectionTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  addButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 3,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  messageState: {
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    minHeight: 150,
    paddingHorizontal: 20,
  },
  messageTitle: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 23,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
    minHeight: 38,
    paddingHorizontal: 13,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
});
