import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { JarPage } from '@/components/jar-page';
import { TaskFormModal, type TaskTemplateFormInput } from '@/components/task-form-modal';
import { TaskLibraryModal } from '@/components/task-library-modal';
import { TaskPlanModal, type AddTaskPlanFormInput } from '@/components/task-plan-modal';
import { TodayTaskListItem } from '@/components/today-task-list-item';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Task, TaskCategory } from '@/models/types';
import {
  archiveTaskCategory,
  createTaskCategory,
  getActiveTaskCategories,
  updateTaskCategory,
} from '@/services/taskCategoryService';
import { getTransactionsByDate } from '@/services/coinTransactionService';
import {
  addTaskToDate,
  getTaskPlansByDate,
  removeTaskPlan,
  type TaskPlanDetails,
} from '@/services/dailyTaskPlanService';
import { completeTaskPlan } from '@/services/taskCompletionService';
import { archiveTask, createTask, getActiveTasks, updateTask } from '@/services/taskService';
import { getLocalDateKey } from '@/utils/localDate';

type LoadState = 'loading' | 'loaded' | 'error';
type TaskFormState = { mode: 'add' } | { mode: 'edit'; task: Task };
type TaskFormExit = { destination: 'library' } | { destination: 'plan'; task: Task };

const SHEET_TRANSITION_DELAY_MS = 260;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The task could not be changed.';
}

export default function TasksScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [plans, setPlans] = useState<TaskPlanDetails[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [libraryTasks, setLibraryTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [libraryLoadState, setLibraryLoadState] = useState<LoadState>('loading');
  const [taskFormState, setTaskFormState] = useState<TaskFormState | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [completingPlanId, setCompletingPlanId] = useState<string | null>(null);
  const [removingPlanId, setRemovingPlanId] = useState<string | null>(null);
  const [archivingTaskId, setArchivingTaskId] = useState<string | null>(null);
  const [balanceRefreshToken, setBalanceRefreshToken] = useState(0);
  const todayLoadRequestIdRef = useRef(0);
  const libraryLoadRequestIdRef = useRef(0);
  const completingPlanIdRef = useRef<string | null>(null);
  const removingPlanIdRef = useRef<string | null>(null);
  const archivingTaskIdRef = useRef<string | null>(null);
  const taskFormExitRef = useRef<TaskFormExit>({ destination: 'library' });
  const sheetTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadToday = useCallback(async (showLoading = true) => {
    const requestId = ++todayLoadRequestIdRef.current;

    if (showLoading) {
      setLoadState('loading');
    }

    try {
      const today = getLocalDateKey(new Date());
      const [todayPlans, todayTransactions] = await Promise.all([
        getTaskPlansByDate(today),
        getTransactionsByDate(today),
      ]);
      const completedPlanKeys = new Set(
        todayTransactions
          .filter((transaction) => transaction.type === 'EARN' && transaction.taskId !== null)
          .map((transaction) => `${transaction.dailyLogId}:${transaction.taskId}`)
      );

      if (requestId !== todayLoadRequestIdRef.current) {
        return;
      }

      setPlans(
        todayPlans.filter(
          ({ plan }) => !completedPlanKeys.has(`${plan.dailyLogId}:${plan.taskId}`)
        )
      );
      setLoadState('loaded');
    } catch {
      if (requestId === todayLoadRequestIdRef.current) {
        setLoadState('error');
      }
    }
  }, []);

  const loadLibrary = useCallback(async () => {
    const requestId = ++libraryLoadRequestIdRef.current;
    setLibraryLoadState('loading');

    try {
      const [activeTasks, activeCategories] = await Promise.all([
        getActiveTasks(),
        getActiveTaskCategories(),
      ]);

      if (requestId !== libraryLoadRequestIdRef.current) {
        return;
      }

      setLibraryTasks(activeTasks);
      setCategories(activeCategories);
      setLibraryLoadState('loaded');
    } catch {
      if (requestId === libraryLoadRequestIdRef.current) {
        setLibraryLoadState('error');
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadToday();

      return () => {
        todayLoadRequestIdRef.current += 1;
      };
    }, [loadToday])
  );

  useEffect(() => {
    return () => {
      if (sheetTransitionTimerRef.current !== null) {
        clearTimeout(sheetTransitionTimerRef.current);
      }
    };
  }, []);

  function scheduleSheetOpen(action: () => void) {
    if (sheetTransitionTimerRef.current !== null) {
      clearTimeout(sheetTransitionTimerRef.current);
    }

    sheetTransitionTimerRef.current = setTimeout(() => {
      action();
      sheetTransitionTimerRef.current = null;
    }, SHEET_TRANSITION_DELAY_MS);
  }

  function openTaskLibrary() {
    setLibraryVisible(true);
    void loadLibrary();
  }

  function openPlanFromLibrary(task: Task) {
    setLibraryVisible(false);
    scheduleSheetOpen(() => setSelectedTask(task));
  }

  function openTaskFormFromLibrary(formState: TaskFormState) {
    taskFormExitRef.current = { destination: 'library' };
    setLibraryVisible(false);
    scheduleSheetOpen(() => setTaskFormState(formState));
  }

  function closeTaskForm() {
    const exit = taskFormExitRef.current;
    setTaskFormState(null);
    taskFormExitRef.current = { destination: 'library' };

    scheduleSheetOpen(() => {
      if (exit.destination === 'plan') {
        setSelectedTask(exit.task);
      } else {
        setLibraryVisible(true);
      }
    });
  }

  async function submitTaskForm(input: TaskTemplateFormInput) {
    if (taskFormState?.mode === 'edit') {
      const updatedTask = await updateTask(taskFormState.task.id, input);

      if (!updatedTask) {
        throw new Error('Task no longer exists.');
      }

      setLibraryTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
      );
      taskFormExitRef.current = { destination: 'library' };
      void loadToday(false);
      return;
    }

    const createdTask = await createTask({
      ...input,
      estimatedDurationMinutes: null,
    });
    setLibraryTasks((currentTasks) => [
      createdTask,
      ...currentTasks.filter((task) => task.id !== createdTask.id),
    ]);
    taskFormExitRef.current = { destination: 'plan', task: createdTask };
  }

  async function createCategory(name: string): Promise<TaskCategory> {
    const createdCategory = await createTaskCategory({ name });
    setCategories((currentCategories) => [...currentCategories, createdCategory]);
    return createdCategory;
  }

  async function updateCategory(
    category: TaskCategory,
    name: string
  ): Promise<TaskCategory> {
    const updatedCategory = await updateTaskCategory(category.id, { name });

    if (!updatedCategory) {
      throw new Error('Category no longer exists.');
    }

    setCategories((currentCategories) =>
      currentCategories.map((currentCategory) =>
        currentCategory.id === updatedCategory.id ? updatedCategory : currentCategory
      )
    );
    return updatedCategory;
  }

  async function archiveCategory(category: TaskCategory) {
    const archivedCategory = await archiveTaskCategory(category.id);

    if (!archivedCategory) {
      throw new Error('Category no longer exists.');
    }

    setCategories((currentCategories) =>
      currentCategories.filter((currentCategory) => currentCategory.id !== category.id)
    );
  }

  async function addSelectedTaskToToday(input: AddTaskPlanFormInput) {
    if (!selectedTask) {
      throw new Error('Select a Task first.');
    }

    try {
      await addTaskToDate({
        taskId: selectedTask.id,
        date: getLocalDateKey(new Date()),
        plannedDurationMinutes: input.plannedDurationMinutes,
        plannedCoinAmount: input.plannedCoinAmount,
        priority: input.priority,
      });
    } catch (error) {
      if (error instanceof Error && /already planned/i.test(error.message)) {
        throw new Error('This task is already in Today.');
      }

      throw error;
    }

    await loadToday(false);
  }

  async function completeSelectedPlan(details: TaskPlanDetails) {
    if (completingPlanIdRef.current !== null || removingPlanIdRef.current !== null) {
      return;
    }

    completingPlanIdRef.current = details.plan.id;
    setCompletingPlanId(details.plan.id);

    try {
      await completeTaskPlan({ planId: details.plan.id });
      setPlans((currentPlans) =>
        currentPlans.filter((currentPlan) => currentPlan.plan.id !== details.plan.id)
      );
      setBalanceRefreshToken((currentToken) => currentToken + 1);
      void loadToday(false);
    } catch (error) {
      Alert.alert('Could not complete task', getErrorMessage(error));
    } finally {
      completingPlanIdRef.current = null;
      setCompletingPlanId(null);
    }
  }

  async function removeSelectedPlan(details: TaskPlanDetails) {
    if (completingPlanIdRef.current !== null || removingPlanIdRef.current !== null) {
      return;
    }

    removingPlanIdRef.current = details.plan.id;
    setRemovingPlanId(details.plan.id);

    try {
      const removed = await removeTaskPlan(details.plan.id);

      if (!removed) {
        throw new Error('This Task is no longer in Today.');
      }

      setPlans((currentPlans) =>
        currentPlans.filter((currentPlan) => currentPlan.plan.id !== details.plan.id)
      );
    } catch (error) {
      Alert.alert('Could not remove task', getErrorMessage(error));
      void loadToday(false);
    } finally {
      removingPlanIdRef.current = null;
      setRemovingPlanId(null);
    }
  }

  function confirmRemovePlan(details: TaskPlanDetails) {
    Alert.alert(
      'Remove from Today?',
      `"${details.task.name}" will remain in your Task Library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void removeSelectedPlan(details),
        },
      ]
    );
  }

  async function archiveSelectedTask(task: Task) {
    if (archivingTaskIdRef.current !== null) {
      return;
    }

    archivingTaskIdRef.current = task.id;
    setArchivingTaskId(task.id);

    try {
      const archivedTask = await archiveTask(task.id);

      if (!archivedTask) {
        throw new Error('Task no longer exists.');
      }

      setLibraryTasks((currentTasks) =>
        currentTasks.filter((currentTask) => currentTask.id !== task.id)
      );
    } catch (error) {
      Alert.alert('Could not delete task', getErrorMessage(error));
    } finally {
      archivingTaskIdRef.current = null;
      setArchivingTaskId(null);
    }
  }

  function confirmDeleteTask(task: Task) {
    if (archivingTaskIdRef.current !== null) {
      return;
    }

    if (plans.some(({ task: plannedTask }) => plannedTask.id === task.id)) {
      Alert.alert(
        'Task is in Today',
        'Remove this task from Today before deleting it from the Task Library.'
      );
      return;
    }

    Alert.alert(
      'Delete task?',
      `"${task.name}" will be removed from your Task Library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void archiveSelectedTask(task),
        },
      ]
    );
  }

  function renderEmptyState() {
    if (loadState === 'loading') {
      return (
        <View style={styles.messageState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.messageText, { color: colors.mutedText }]}>Loading Today...</Text>
        </View>
      );
    }

    if (loadState === 'error') {
      return (
        <View style={styles.messageState}>
          <Text style={[styles.messageTitle, { color: colors.text }]}>Today is unavailable</Text>
          <Text style={[styles.messageText, { color: colors.mutedText }]}>Please try again.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadToday()}
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
        <Text style={[styles.messageTitle, { color: colors.text }]}>Nothing planned for today.</Text>
        <Text style={[styles.messageText, { color: colors.mutedText }]}>Choose a saved task or create a new one.</Text>
      </View>
    );
  }

  const selectedTaskCategoryName = selectedTask
    ? categories.find((category) => category.id === selectedTask.categoryId)?.name ??
      'Archived category'
    : '';
  const defaultCategoryId = categories[0]?.id ?? '';
  const planMutationInProgress = completingPlanId !== null || removingPlanId !== null;

  return (
    <JarPage balanceRefreshToken={balanceRefreshToken}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={plans}
        keyExtractor={({ plan }) => plan.id}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          <View style={[styles.sectionHeader, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today</Text>
            <Pressable
              accessibilityLabel="Open Task Library"
              accessibilityRole="button"
              disabled={planMutationInProgress}
              onPress={openTaskLibrary}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: colors.surface,
                  opacity: pressed || planMutationInProgress ? 0.62 : 1,
                },
              ]}>
              <MaterialIcons name="add" size={19} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>New Task</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <TodayTaskListItem
            details={item}
            isCompleting={completingPlanId === item.plan.id}
            isDisabled={planMutationInProgress}
            isRemoving={removingPlanId === item.plan.id}
            onComplete={(details) => void completeSelectedPlan(details)}
            onRemove={confirmRemovePlan}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <TaskLibraryModal
        categories={categories}
        isMutating={archivingTaskId !== null}
        loadState={libraryLoadState}
        onCreate={() => openTaskFormFromLibrary({ mode: 'add' })}
        onDelete={confirmDeleteTask}
        onEdit={(task) => openTaskFormFromLibrary({ mode: 'edit', task })}
        onRequestClose={() => setLibraryVisible(false)}
        onRetry={() => void loadLibrary()}
        onSelect={openPlanFromLibrary}
        tasks={libraryTasks}
        visible={libraryVisible}
      />

      <TaskFormModal
        categories={categories}
        defaultCategoryId={defaultCategoryId}
        initialValues={taskFormState?.mode === 'edit' ? taskFormState.task : null}
        mode={taskFormState?.mode ?? 'add'}
        onArchiveCategory={archiveCategory}
        onCreateCategory={createCategory}
        onRequestClose={closeTaskForm}
        onSubmit={submitTaskForm}
        onUpdateCategory={updateCategory}
        visible={taskFormState !== null}
      />

      <TaskPlanModal
        categoryName={selectedTaskCategoryName}
        onRequestClose={() => setSelectedTask(null)}
        onSubmit={addSelectedTaskToToday}
        task={selectedTask}
        visible={selectedTask !== null}
      />
    </JarPage>
  );
}

const styles = StyleSheet.create({
  listContent: { flexGrow: 1, paddingBottom: 28, paddingHorizontal: 22 },
  sectionHeader: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 10,
    minHeight: 48,
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
    minHeight: 40,
    paddingHorizontal: 11,
  },
  addButtonText: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  messageState: {
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    minHeight: 160,
    paddingHorizontal: 20,
  },
  messageTitle: { fontSize: 17, fontWeight: '600', lineHeight: 23, textAlign: 'center' },
  messageText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  retryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
    minHeight: 40,
    paddingHorizontal: 13,
  },
  retryText: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
});
