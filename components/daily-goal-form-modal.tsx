import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TaskDurationPicker } from '@/components/task-duration-picker';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { DailyGoal } from '@/models/types';
import { calculateDailyGoalBonuses } from '@/utils/dailyGoal';

export type DailyGoalFormInput = {
  focusGoalMinutes: number;
  taskGoalCount: number;
};

type DailyGoalFormModalProps = {
  visible: boolean;
  initialGoal: DailyGoal | null;
  typicalHourlyRate: number | null;
  onRequestClose: () => void;
  onSubmit: (input: DailyGoalFormInput) => Promise<void>;
};

export function DailyGoalFormModal({
  visible,
  initialGoal,
  typicalHourlyRate,
  onRequestClose,
  onSubmit,
}: DailyGoalFormModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [hours, setHours] = useState(3);
  const [minutes, setMinutes] = useState(0);
  const [taskGoalCount, setTaskGoalCount] = useState(5);
  const [taskGoalText, setTaskGoalText] = useState('5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const focusGoalMinutes = hours * 60 + minutes;
  const validTaskGoal = Number.isInteger(taskGoalCount) && taskGoalCount >= 3;
  const validDuration = focusGoalMinutes >= 1 && focusGoalMinutes <= 1439;
  const bonuses =
    typicalHourlyRate !== null && validDuration && validTaskGoal
      ? calculateDailyGoalBonuses(typicalHourlyRate, focusGoalMinutes, taskGoalCount)
      : null;
  const canSubmit = bonuses !== null && !isSubmitting;

  useEffect(() => {
    if (!visible) return;

    const initialMinutes = initialGoal?.focusGoalMinutes ?? 180;
    const initialTaskCount = initialGoal?.taskGoalCount ?? 5;
    setHours(Math.floor(initialMinutes / 60));
    setMinutes(initialMinutes % 60);
    setTaskGoalCount(initialTaskCount);
    setTaskGoalText(String(initialTaskCount));
    setErrorMessage(null);
  }, [initialGoal, visible]);

  function closeModal() {
    if (!isSubmittingRef.current) onRequestClose();
  }

  function setTaskCount(value: number) {
    const nextValue = Math.max(3, value);
    setTaskGoalCount(nextValue);
    setTaskGoalText(String(nextValue));
  }

  async function submit() {
    if (!canSubmit || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({ focusGoalMinutes, taskGoalCount });
      onRequestClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Daily Goals could not be saved.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={closeModal} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.eyebrow, { color: colors.mutedText }]}>Today</Text>
              <Text style={[styles.title, { color: colors.text }]}>{initialGoal ? 'Edit Daily Goals' : 'Set Daily Goals'}</Text>
            </View>
            <Pressable accessibilityLabel="Close Daily Goals" accessibilityRole="button" disabled={isSubmitting} hitSlop={10} onPress={closeModal} style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.55 : 1 }]}>
              <MaterialIcons name="close" size={25} color={colors.icon} />
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Focus Time Goal</Text>
            <TaskDurationPicker disabled={isSubmitting} hours={hours} minutes={minutes} onHoursChange={setHours} onMinutesChange={setMinutes} />
            {!validDuration ? <Text style={[styles.errorText, { color: colors.danger }]}>Choose at least one minute.</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Completed Tasks Goal</Text>
            <View style={[styles.stepper, { backgroundColor: colors.surfaceMuted }]}>
              <Pressable accessibilityLabel="Decrease completed tasks goal" accessibilityRole="button" disabled={isSubmitting || taskGoalCount <= 3} onPress={() => setTaskCount(taskGoalCount - 1)} style={({ pressed }) => [styles.stepButton, { opacity: pressed || taskGoalCount <= 3 ? 0.45 : 1 }]}>
                <MaterialIcons name="remove" size={22} color={colors.primary} />
              </Pressable>
              <TextInput
                accessibilityLabel="Completed tasks goal"
                keyboardType="number-pad"
                maxLength={4}
                onChangeText={(value) => {
                  setTaskGoalText(value);
                  const parsed = Number(value);
                  setTaskGoalCount(Number.isInteger(parsed) ? parsed : 0);
                }}
                onEndEditing={() => {
                  if (!validTaskGoal) setTaskCount(3);
                }}
                selectionColor={colors.primary}
                style={[styles.taskInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={taskGoalText}
              />
              <Pressable accessibilityLabel="Increase completed tasks goal" accessibilityRole="button" disabled={isSubmitting} onPress={() => setTaskCount(Math.max(3, taskGoalCount) + 1)} style={({ pressed }) => [styles.stepButton, { opacity: pressed ? 0.55 : 1 }]}>
                <MaterialIcons name="add" size={22} color={colors.primary} />
              </Pressable>
            </View>
            {!validTaskGoal ? <Text style={[styles.errorText, { color: colors.danger }]}>Choose at least 3 tasks.</Text> : null}
          </View>

          <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>Bonus preview</Text>
            {bonuses ? (
              <>
                <PreviewRow label="Focus bonus" amount={bonuses.focusBonusAmount} />
                <PreviewRow label="Task bonus" amount={bonuses.taskBonusAmount} />
                <PreviewRow label="Both goals" amount={bonuses.comboBonusAmount} />
              </>
            ) : (
              <Text style={[styles.helperText, { color: colors.mutedText }]}>Create a Task first to calculate bonuses.</Text>
            )}
            <Text style={[styles.helperText, { color: colors.mutedText }]}>Bonuses adapt automatically to your recent task economy.</Text>
          </View>

          {errorMessage ? <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text> : null}

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={closeModal} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}>
              <Text style={[styles.secondaryText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={!canSubmit} onPress={() => void submit()} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: !canSubmit || pressed ? 0.55 : 1 }]}>
              {isSubmitting ? <ActivityIndicator color={colors.primaryContrast} size="small" /> : <Text style={[styles.primaryText, { color: colors.primaryContrast }]}>Save Goals</Text>}
            </Pressable>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function PreviewRow({ label, amount }: { label: string; amount: number }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.previewRow}>
      <Text style={[styles.previewLabel, { color: colors.mutedText }]}>{label}</Text>
      <Text style={[styles.previewAmount, { color: colors.coinDeep }]}>+{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { alignSelf: 'center', gap: 24, maxWidth: 600, paddingBottom: 30, paddingHorizontal: 22, paddingTop: 16, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row' },
  headerText: { flex: 1, minWidth: 0, paddingRight: 12 },
  eyebrow: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  title: { fontFamily: Fonts.rounded, fontSize: 28, fontWeight: '700', lineHeight: 36 },
  closeButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  stepper: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 8, flexDirection: 'row', gap: 4, padding: 4 },
  stepButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  taskInput: { borderRadius: 7, borderWidth: StyleSheet.hairlineWidth, fontSize: 20, fontWeight: '700', height: 44, textAlign: 'center', width: 70 },
  preview: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, gap: 8, padding: 14 },
  previewTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  previewRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  previewLabel: { fontSize: 13, lineHeight: 18 },
  previewAmount: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  helperText: { fontSize: 12, lineHeight: 17 },
  errorText: { fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  secondaryButton: { alignItems: 'center', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', minHeight: 46, paddingHorizontal: 17 },
  secondaryText: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  primaryButton: { alignItems: 'center', borderRadius: 8, justifyContent: 'center', minHeight: 46, minWidth: 130, paddingHorizontal: 17 },
  primaryText: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
});
