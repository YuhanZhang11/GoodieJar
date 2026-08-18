import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Task } from '@/models/types';

type TaskListItemProps = {
  task: Task;
  isDisabled: boolean;
  isCompleting: boolean;
  onComplete: (task: Task) => void;
};

export function TaskListItem({
  task,
  isDisabled,
  isCompleting,
  onComplete,
}: TaskListItemProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const description = task.description.trim();
  const metadata = [
    task.estimatedDurationMinutes === null ? null : `${task.estimatedDurationMinutes} min`,
    description || null,
  ]
    .filter((value): value is string => value !== null)
    .join(' \u00B7 ');

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.primaryRow}>
        <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.name, { color: colors.text }]}>
          {task.name}
        </Text>

        <View style={[styles.reward, { backgroundColor: colors.surfaceMuted }]}>
          <MaterialIcons name="monetization-on" size={17} color={colors.coin} />
          <Text style={[styles.rewardText, { color: colors.text }]}>+{task.coinReward}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Complete ${task.name}`}
          disabled={isDisabled}
          onPress={() => onComplete(task)}
          style={({ pressed }) => [
            styles.doneButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed || isDisabled ? 0.7 : 1,
            },
          ]}>
          {isCompleting ? (
            <ActivityIndicator color={colors.primaryContrast} size="small" />
          ) : (
            <>
              <MaterialIcons name="done" size={17} color={colors.primaryContrast} />
              <Text style={[styles.doneText, { color: colors.primaryContrast }]}>Done</Text>
            </>
          )}
        </Pressable>
      </View>

      {metadata ? (
        <Text ellipsizeMode="tail" numberOfLines={2} style={[styles.metadata, { color: colors.mutedText }]}>
          {metadata}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 5,
    paddingVertical: 10,
  },
  primaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
    minWidth: 0,
  },
  reward: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 2,
    minHeight: 28,
    paddingHorizontal: 7,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  doneButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 3,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 72,
    paddingHorizontal: 9,
  },
  doneText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  metadata: {
    fontSize: 12,
    lineHeight: 17,
    paddingRight: 4,
  },
});
