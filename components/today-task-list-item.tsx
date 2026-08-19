import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TaskPriority } from '@/models/types';
import type { TaskPlanDetails } from '@/services/dailyTaskPlanService';

type TodayTaskListItemProps = {
  details: TaskPlanDetails;
  isCompleting: boolean;
  isRemoving: boolean;
  isDisabled: boolean;
  onComplete: (details: TaskPlanDetails) => void;
  onRemove: (details: TaskPlanDetails) => void;
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  NORMAL: 'Normal',
  IMPORTANT: 'Important',
  URGENT: 'Urgent',
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

export function TodayTaskListItem({
  details,
  isCompleting,
  isRemoving,
  isDisabled,
  onComplete,
  onRemove,
}: TodayTaskListItemProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { plan, task, category } = details;

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.primaryRow}>
        <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.name, { color: colors.text }]}>
          {task.name}
        </Text>

        <Pressable
          accessibilityLabel={`Complete ${task.name}`}
          accessibilityRole="button"
          disabled={isDisabled}
          onPress={() => onComplete(details)}
          style={({ pressed }) => [
            styles.doneButton,
            { backgroundColor: colors.primary, opacity: pressed || isDisabled ? 0.62 : 1 },
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

      <View style={styles.secondaryRow}>
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={[styles.metadata, { color: colors.mutedText }]}>
          {category.name} {'\u00B7'} {formatDuration(plan.plannedDurationMinutes)} {'\u00B7'}{' '}
          {PRIORITY_LABELS[plan.priority]}
        </Text>
        <View style={[styles.reward, { backgroundColor: colors.surfaceMuted }]}>
          <MaterialIcons name="monetization-on" size={17} color={colors.coin} />
          <Text style={[styles.rewardText, { color: colors.coinDeep }]}>+{plan.plannedCoinAmount}</Text>
        </View>
        <Pressable
          accessibilityLabel={`Remove ${task.name} from Today`}
          accessibilityRole="button"
          disabled={isDisabled}
          onPress={() => onRemove(details)}
          style={({ pressed }) => [styles.removeButton, { opacity: pressed || isDisabled ? 0.55 : 1 }]}>
          {isRemoving ? (
            <ActivityIndicator color={colors.mutedText} size="small" />
          ) : (
            <Text style={[styles.removeText, { color: colors.mutedText }]}>Remove</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 7,
    paddingVertical: 11,
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
    minHeight: 30,
    paddingHorizontal: 8,
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
    minHeight: 40,
    minWidth: 76,
    paddingHorizontal: 10,
  },
  doneText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  secondaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    minHeight: 30,
  },
  metadata: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    minWidth: 0,
  },
  removeButton: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: 40,
    paddingLeft: 3,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
});
