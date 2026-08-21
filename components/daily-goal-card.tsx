import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { DailyGoalProgress } from '@/services/dailyGoalService';

type DailyGoalCardProps = {
  progress: DailyGoalProgress;
  totalActiveSeconds: number;
  disabled?: boolean;
  onSetGoals: () => void;
  onEditGoals: () => void;
  onFinishToday: () => void;
};

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function GoalProgressRow({
  amount,
  currentLabel,
  finished,
  progress,
  reached,
  reachedTitle,
  title,
}: {
  amount: number;
  currentLabel: string;
  finished: boolean;
  progress: number;
  reached: boolean;
  reachedTitle: string;
  title: string;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.goalRow}>
      <View style={styles.goalHeading}>
        <View style={styles.goalTitleGroup}>
          <Text style={[styles.goalTitle, { color: colors.text }]}>
            {reached ? reachedTitle : title}
          </Text>
          {reached ? (
            <MaterialIcons name="check-circle" size={17} color={colors.primary} />
          ) : null}
        </View>
        {reached ? (
          <Text style={[styles.goalAmount, { color: colors.coinDeep }]}>
            {finished ? `+${amount}` : `Pending +${amount}`}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.goalCounter, { color: colors.mutedText }]}>{currentLabel}</Text>
      <View
        accessibilityLabel={`${title} progress ${Math.round(progress * 100)} percent`}
        accessibilityRole="progressbar"
        style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: `${Math.min(Math.max(progress, 0), 1) * 100}%`,
            },
          ]}
        />
      </View>
      {!reached ? (
        <Text style={[styles.reachText, { color: colors.mutedText }]}>
          {finished ? 'Goal not reached' : `Reach goal | +${amount} bonus`}
        </Text>
      ) : null}
    </View>
  );
}

export function DailyGoalCard({
  progress,
  totalActiveSeconds,
  disabled = false,
  onSetGoals,
  onEditGoals,
  onFinishToday,
}: DailyGoalCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { goal } = progress;

  if (!goal) {
    const unavailable = progress.typicalHourlyRate === null;
    const message = unavailable
      ? 'Create a Task first to set Daily Goals.'
      : 'Set goals for today and finish when you are ready to settle your bonuses.';

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.titleGroup}>
            <MaterialIcons name="flag" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Daily Goals</Text>
          </View>
          {!unavailable ? (
            <Pressable
              accessibilityLabel="Set today's goals"
              accessibilityRole="button"
              disabled={disabled}
              onPress={onSetGoals}
              style={({ pressed }) => [
                styles.textButton,
                { opacity: pressed || disabled ? 0.55 : 1 },
              ]}>
              <Text style={[styles.textButtonLabel, { color: colors.primary }]}>Set Today&apos;s Goals</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.helper, { color: colors.mutedText }]}>{message}</Text>
      </View>
    );
  }

  const finished = goal.finishedAt !== null;
  const displayedActiveSeconds = finished
    ? (goal.finalFocusSecondsSnapshot ?? 0)
    : totalActiveSeconds;
  const displayedCompletedTasks = finished
    ? (goal.finalCompletedTaskCountSnapshot ?? 0)
    : progress.completedTaskCount;
  const bonuses = progress.bonusPreview;

  if (!bonuses) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.titleGroup}>
            <MaterialIcons name="flag" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Daily Goals</Text>
          </View>
        </View>
        <Text style={[styles.helper, { color: colors.mutedText }]}>
          Create an active Task to calculate and settle Daily Goal bonuses.
        </Text>
      </View>
    );
  }

  const activeMinutes = Math.floor(displayedActiveSeconds / 60);
  const focusReached = displayedActiveSeconds >= goal.focusGoalMinutes * 60;
  const taskReached = displayedCompletedTasks >= goal.taskGoalCount;
  const comboReached = focusReached && taskReached;
  const totalBonus =
    (focusReached ? bonuses.focusBonusAmount : 0) +
    (taskReached ? bonuses.taskBonusAmount : 0) +
    (comboReached ? bonuses.comboBonusAmount : 0);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleGroup}>
          <MaterialIcons name="flag" size={20} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Daily Goals</Text>
          {finished ? (
            <View style={[styles.finishedBadge, { backgroundColor: colors.surfaceMuted }]}>
              <MaterialIcons name="check" size={13} color={colors.mutedText} />
              <Text style={[styles.finishedText, { color: colors.mutedText }]}>Finished</Text>
            </View>
          ) : null}
        </View>
        {!finished ? (
          <Pressable
            accessibilityLabel="Edit today's goals"
            accessibilityRole="button"
            disabled={disabled}
            onPress={onEditGoals}
            style={({ pressed }) => [
              styles.textButton,
              { opacity: pressed || disabled ? 0.55 : 1 },
            ]}>
            <Text style={[styles.textButtonLabel, { color: colors.primary }]}>Edit Goals</Text>
          </Pressable>
        ) : null}
      </View>

      <GoalProgressRow
        amount={bonuses.focusBonusAmount}
        currentLabel={`${formatMinutes(activeMinutes)} / ${formatMinutes(goal.focusGoalMinutes)}`}
        finished={finished}
        progress={displayedActiveSeconds / (goal.focusGoalMinutes * 60)}
        reached={focusReached}
        reachedTitle="Focus Goal Reached"
        title="Focus Time"
      />
      <GoalProgressRow
        amount={bonuses.taskBonusAmount}
        currentLabel={`${displayedCompletedTasks} / ${goal.taskGoalCount} tasks`}
        finished={finished}
        progress={displayedCompletedTasks / goal.taskGoalCount}
        reached={taskReached}
        reachedTitle="Task Goal Reached"
        title="Completed Tasks"
      />

      {comboReached ? (
        <View style={[styles.comboRow, { backgroundColor: colors.surfaceMuted }]}>
          <View style={styles.goalTitleGroup}>
            <MaterialIcons name="auto-awesome" size={17} color={colors.coinDeep} />
            <Text style={[styles.comboText, { color: colors.text }]}>Both Goals Reached</Text>
          </View>
          <Text style={[styles.goalAmount, { color: colors.coinDeep }]}>
            {finished
              ? `+${bonuses.comboBonusAmount}`
              : `Pending +${bonuses.comboBonusAmount}`}
          </Text>
        </View>
      ) : null}

      {finished ? (
        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>{"Today's Bonus"}</Text>
          <Text style={[styles.totalAmount, { color: colors.coinDeep }]}>+{totalBonus}</Text>
        </View>
      ) : (
        <Pressable
          accessibilityLabel="Finish today and settle Daily Goal bonuses"
          accessibilityRole="button"
          disabled={disabled}
          onPress={onFinishToday}
          style={({ pressed }) => [
            styles.finishButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed || disabled ? 0.55 : 1,
            },
          ]}>
          <Text style={[styles.finishButtonText, { color: colors.primaryContrast }]}>
            Finish Today
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    marginTop: 10,
    padding: 14,
  },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  titleGroup: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 7, minWidth: 0 },
  cardTitle: { fontFamily: Fonts.rounded, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  textButton: { alignItems: 'center', justifyContent: 'center', minHeight: 40, paddingHorizontal: 6 },
  textButtonLabel: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  helper: { fontSize: 13, lineHeight: 19 },
  finishedBadge: {
    alignItems: 'center',
    borderRadius: 7,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  finishedText: { fontSize: 11, fontWeight: '700', lineHeight: 15 },
  goalRow: { gap: 5 },
  goalHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  goalTitleGroup: { alignItems: 'center', flexDirection: 'row', gap: 5, minWidth: 0 },
  goalTitle: { flexShrink: 1, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  goalAmount: { flexShrink: 0, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  goalCounter: { fontSize: 12, lineHeight: 17 },
  progressTrack: { borderRadius: 3, height: 6, overflow: 'hidden' },
  progressFill: { borderRadius: 3, height: '100%' },
  reachText: { fontSize: 11, lineHeight: 15 },
  comboRow: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  comboText: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  totalRow: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  totalAmount: { fontFamily: Fonts.rounded, fontSize: 21, fontWeight: '700', lineHeight: 27 },
  finishButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  finishButtonText: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
});
