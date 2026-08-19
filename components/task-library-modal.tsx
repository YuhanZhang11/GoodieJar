import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TaskListItem } from '@/components/task-list-item';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Task, TaskCategory } from '@/models/types';

type LoadState = 'loading' | 'loaded' | 'error';

type TaskLibraryModalProps = {
  visible: boolean;
  tasks: Task[];
  categories: TaskCategory[];
  loadState: LoadState;
  isMutating: boolean;
  onRequestClose: () => void;
  onRetry: () => void;
  onCreate: () => void;
  onSelect: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function TaskLibraryModal({
  visible,
  tasks,
  categories,
  loadState,
  isMutating,
  onRequestClose,
  onRetry,
  onCreate,
  onSelect,
  onEdit,
  onDelete,
}: TaskLibraryModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  function registerOpenSwipeable(methods: SwipeableMethods) {
    if (openSwipeableRef.current !== methods) {
      openSwipeableRef.current?.close();
      openSwipeableRef.current = methods;
    }
  }

  function clearOpenSwipeable(methods: SwipeableMethods) {
    if (openSwipeableRef.current === methods) {
      openSwipeableRef.current = null;
    }
  }

  function closeAndRun(action: () => void) {
    openSwipeableRef.current?.close();
    action();
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
          <Text style={[styles.messageTitle, { color: colors.text }]}>Task Library unavailable</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
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
        <Text style={[styles.messageTitle, { color: colors.text }]}>No saved tasks yet.</Text>
        <Text style={[styles.messageText, { color: colors.mutedText }]}>Create one to reuse each day.</Text>
      </View>
    );
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onRequestClose}
      presentationStyle="pageSheet"
      visible={visible}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: colors.mutedText }]}>Add Task</Text>
            <Text style={[styles.title, { color: colors.text }]}>Existing Tasks</Text>
          </View>
          <Pressable
            accessibilityLabel="Close Task Library"
            accessibilityRole="button"
            disabled={isMutating}
            hitSlop={10}
            onPress={onRequestClose}
            style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.55 : 1 }]}>
            <MaterialIcons name="close" size={25} color={colors.icon} />
          </Pressable>
        </View>

        <FlatList
          contentContainerStyle={styles.listContent}
          data={loadState === 'loaded' ? tasks : []}
          keyExtractor={(task) => task.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={renderEmptyState}
          ListHeaderComponent={
            <Pressable
              accessibilityLabel="Create new task template"
              accessibilityRole="button"
              disabled={isMutating || loadState !== 'loaded'}
              onPress={() => closeAndRun(onCreate)}
              style={({ pressed }) => [
                styles.createButton,
                {
                  backgroundColor: colors.surfaceMuted,
                  opacity: pressed || isMutating || loadState !== 'loaded' ? 0.62 : 1,
                },
              ]}>
              <MaterialIcons name="add" size={20} color={colors.primary} />
              <Text style={[styles.createText, { color: colors.primary }]}>Create New Task</Text>
            </Pressable>
          }
          renderItem={({ item }) => (
            <TaskListItem
              categoryName={categoryNames.get(item.categoryId) ?? 'Archived category'}
              isDisabled={isMutating}
              onDelete={onDelete}
              onEdit={(task) => closeAndRun(() => onEdit(task))}
              onSelect={(task) => closeAndRun(() => onSelect(task))}
              onSwipeClose={clearOpenSwipeable}
              onSwipeOpen={registerOpenSwipeable}
              task={item}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    maxWidth: 600,
    paddingHorizontal: 22,
    paddingTop: 16,
    width: '100%',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  listContent: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: 600,
    paddingBottom: 30,
    paddingHorizontal: 22,
    paddingTop: 18,
    width: '100%',
  },
  createButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  createText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  messageState: {
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    minHeight: 180,
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
    minHeight: 40,
    paddingHorizontal: 13,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
});
