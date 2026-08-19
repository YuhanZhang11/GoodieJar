import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { SwipeableRow } from '@/components/swipeable-row';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Task } from '@/models/types';

type TaskListItemProps = {
  task: Task;
  categoryName: string;
  isDisabled: boolean;
  onSelect: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onSwipeOpen: (methods: SwipeableMethods) => void;
  onSwipeClose: (methods: SwipeableMethods) => void;
};

export function TaskListItem({
  task,
  categoryName,
  isDisabled,
  onSelect,
  onEdit,
  onDelete,
  onSwipeOpen,
  onSwipeClose,
}: TaskListItemProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SwipeableRow
      disabled={isDisabled}
      onClose={onSwipeClose}
      onDelete={() => onDelete(task)}
      onEdit={() => onEdit(task)}
      onOpen={onSwipeOpen}>
      <Pressable
        accessibilityLabel={`Add ${task.name} to Today, category ${categoryName}`}
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={() => onSelect(task)}
        style={({ pressed }) => [
          styles.container,
          {
            borderBottomColor: colors.border,
            opacity: pressed || isDisabled ? 0.62 : 1,
          },
        ]}>
        <View style={styles.textBlock}>
          <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.name, { color: colors.text }]}>
            {task.name}
          </Text>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.category, { color: colors.mutedText }]}>
            {categoryName}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
      </Pressable>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    minHeight: 62,
    paddingVertical: 9,
  },
  textBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
  },
  category: {
    fontSize: 13,
    lineHeight: 18,
  },
});
