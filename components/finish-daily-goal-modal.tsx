import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { DailyGoalProgress } from '@/services/dailyGoalService';

type FinishDailyGoalModalProps = {
  progress: DailyGoalProgress | null;
  totalActiveSeconds: number;
  visible: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onRequestClose: () => void;
  onConfirm: () => void;
};

function ResultRow({
  amount,
  label,
  reached,
}: {
  amount: number;
  label: string;
  reached: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.resultRow}>
      <Text style={[styles.resultLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.resultValue}>
        <Text style={[styles.resultState, { color: colors.mutedText }]}>
          {reached ? 'Reached' : 'Not reached'}
        </Text>
        {reached ? (
          <Text style={[styles.resultAmount, { color: colors.coinDeep }]}>+{amount}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function FinishDailyGoalModal({
  progress,
  totalActiveSeconds,
  visible,
  isSubmitting,
  errorMessage,
  onRequestClose,
  onConfirm,
}: FinishDailyGoalModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const goal = progress?.goal ?? null;
  const bonuses = progress?.bonusPreview ?? null;

  if (!progress || !goal || !bonuses) return null;

  const focusMinutes = Math.floor(totalActiveSeconds / 60);
  const focusReached = totalActiveSeconds >= goal.focusGoalMinutes * 60;
  const taskReached = progress.completedTaskCount >= goal.taskGoalCount;
  const comboReached = focusReached && taskReached;
  const total =
    (focusReached ? bonuses.focusBonusAmount : 0) +
    (taskReached ? bonuses.taskBonusAmount : 0) +
    (comboReached ? bonuses.comboBonusAmount : 0);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onRequestClose}
      presentationStyle="pageSheet"
      visible={visible}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>Finish today?</Text>
              <Text style={[styles.subtitle, { color: colors.mutedText }]}>
                Your Daily Goal result and bonuses will be final.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Keep going"
              accessibilityRole="button"
              disabled={isSubmitting}
              hitSlop={10}
              onPress={onRequestClose}
              style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.55 : 1 }]}>
              <MaterialIcons name="close" size={25} color={colors.icon} />
            </Pressable>
          </View>

          <View style={[styles.progressPanel, { backgroundColor: colors.surfaceMuted }]}>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: colors.text }]}>Focus Time</Text>
              <View style={styles.progressValue}>
                <Text style={[styles.progressText, { color: colors.text }]}>
                  {focusMinutes} / {goal.focusGoalMinutes} min
                </Text>
                {focusReached ? (
                  <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                ) : null}
              </View>
            </View>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: colors.text }]}>Completed Tasks</Text>
              <View style={styles.progressValue}>
                <Text style={[styles.progressText, { color: colors.text }]}>
                  {progress.completedTaskCount} / {goal.taskGoalCount}
                </Text>
                {taskReached ? (
                  <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                ) : null}
              </View>
            </View>
          </View>

          <View style={[styles.bonusPanel, { borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{"Today's bonus"}</Text>
            <ResultRow
              amount={bonuses.focusBonusAmount}
              label="Focus Goal"
              reached={focusReached}
            />
            <ResultRow
              amount={bonuses.taskBonusAmount}
              label="Task Goal"
              reached={taskReached}
            />
            <ResultRow
              amount={bonuses.comboBonusAmount}
              label="Both Goals"
              reached={comboReached}
            />
            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.totalAmount, { color: colors.coinDeep }]}>+{total}</Text>
            </View>
          </View>

          {errorMessage ? (
            <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.danger }]}>
              {errorMessage}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={onRequestClose}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
              ]}>
              <Text style={[styles.secondaryText, { color: colors.text }]}>Keep Going</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: pressed || isSubmitting ? 0.55 : 1 },
              ]}>
              {isSubmitting ? (
                <ActivityIndicator color={colors.primaryContrast} size="small" />
              ) : (
                <Text style={[styles.primaryText, { color: colors.primaryContrast }]}>
                  Finish Today
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    alignSelf: 'center',
    flex: 1,
    gap: 22,
    maxWidth: 600,
    paddingBottom: 24,
    paddingHorizontal: 22,
    paddingTop: 18,
    width: '100%',
  },
  header: { alignItems: 'flex-start', flexDirection: 'row' },
  headerText: { flex: 1, gap: 5, minWidth: 0, paddingRight: 10 },
  title: { fontFamily: Fonts.rounded, fontSize: 28, fontWeight: '700', lineHeight: 35 },
  subtitle: { fontSize: 13, lineHeight: 19 },
  closeButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  progressPanel: { borderRadius: 8, gap: 12, padding: 14 },
  progressRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  progressValue: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  progressText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  bonusPanel: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, gap: 12, padding: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  resultRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  resultLabel: { fontSize: 13, lineHeight: 18 },
  resultValue: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  resultState: { fontSize: 12, lineHeight: 17 },
  resultAmount: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  totalRow: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  totalAmount: { fontFamily: Fonts.rounded, fontSize: 24, fontWeight: '700', lineHeight: 30 },
  errorText: { fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 'auto' },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  secondaryText: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  primaryText: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
});
