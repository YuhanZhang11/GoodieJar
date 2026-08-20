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
import type { Task, TaskPriority } from '@/models/types';
import { calculateSuggestedGoalRewardForMinutes } from '@/utils/taskReward';

export type AddTaskPlanFormInput = {
  plannedDurationMinutes: number;
  plannedCoinAmount: number;
  priority: TaskPriority;
};

type TaskPlanModalProps = {
  visible: boolean;
  task: Task | null;
  categoryName: string;
  onRequestClose: () => void;
  onSubmit: (input: AddTaskPlanFormInput) => Promise<void>;
};

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'IMPORTANT', label: 'Important' },
  { value: 'URGENT', label: 'Urgent' },
];

function isPositiveIntegerInput(value: string): boolean {
  const parsedValue = Number(value);

  return value.trim().length > 0 && Number.isInteger(parsedValue) && parsedValue > 0;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Task could not be added to Today.';
}

export function TaskPlanModal({
  visible,
  task,
  categoryName,
  onRequestClose,
  onSubmit,
}: TaskPlanModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [coinAmount, setCoinAmount] = useState('');
  const [hasCoinOverride, setHasCoinOverride] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const plannedDurationMinutes = hours * 60 + minutes;
  const durationIsValid = plannedDurationMinutes > 0;
  const suggestedCoinAmount =
    task && durationIsValid
      ? calculateSuggestedGoalRewardForMinutes(
          plannedDurationMinutes,
          task.coinsPerHour,
          task.isFocused
        )
      : 0;
  const canSubmit =
    task !== null && durationIsValid && isPositiveIntegerInput(coinAmount) && !isSubmitting;

  useEffect(() => {
    if (!visible) {
      return;
    }

    const suggestedDuration = Math.min(
      Math.max(task?.estimatedDurationMinutes ?? 30, 1),
      23 * 60 + 59
    );
    const suggestedHoursPart = Math.floor(suggestedDuration / 60);
    const suggestedMinutesPart = suggestedDuration % 60;
    const initialCoinAmount = task
      ? calculateSuggestedGoalRewardForMinutes(
          suggestedDuration,
          task.coinsPerHour,
          task.isFocused
        )
      : 0;

    setHours(suggestedHoursPart);
    setMinutes(suggestedMinutesPart);
    setPriority('NORMAL');
    setCoinAmount(initialCoinAmount > 0 ? String(initialCoinAmount) : '');
    setHasCoinOverride(false);
    setErrorMessage(null);
  }, [task, visible]);

  useEffect(() => {
    if (visible && !hasCoinOverride) {
      setCoinAmount(suggestedCoinAmount > 0 ? String(suggestedCoinAmount) : '');
    }
  }, [hasCoinOverride, suggestedCoinAmount, visible]);

  function closeModal() {
    if (!isSubmittingRef.current) {
      onRequestClose();
    }
  }

  async function submitPlan() {
    if (!canSubmit || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        plannedDurationMinutes,
        plannedCoinAmount: Number(coinAmount),
        priority,
      });
      onRequestClose();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={closeModal}
      presentationStyle="pageSheet"
      visible={visible}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={[styles.eyebrow, { color: colors.mutedText }]}>Add to Today</Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.76}
                  numberOfLines={1}
                  style={[styles.title, { color: colors.text }]}>
                  {task?.name ?? 'Task'}
                </Text>
                <Text numberOfLines={1} style={[styles.category, { color: colors.mutedText }]}>
                  {categoryName}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close Add to Today"
                accessibilityRole="button"
                disabled={isSubmitting}
                hitSlop={10}
                onPress={closeModal}
                style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.55 : 1 }]}>
                <MaterialIcons name="close" size={25} color={colors.icon} />
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Goal Duration</Text>
              <TaskDurationPicker
                disabled={isSubmitting}
                hours={hours}
                minutes={minutes}
                onHoursChange={setHours}
                onMinutesChange={setMinutes}
              />
              {!durationIsValid ? (
                <Text style={[styles.helperText, { color: colors.danger }]}>Duration must be greater than zero.</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Priority</Text>
              <View style={[styles.priorityGroup, { backgroundColor: colors.surfaceMuted }]}>
                {PRIORITIES.map((option) => {
                  const isSelected = priority === option.value;

                  return (
                    <Pressable
                      accessibilityLabel={`${option.label} priority`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      disabled={isSubmitting}
                      key={option.value}
                      onPress={() => setPriority(option.value)}
                      style={({ pressed }) => [
                        styles.priorityButton,
                        {
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                          opacity: pressed ? 0.66 : 1,
                        },
                      ]}>
                      <Text
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        numberOfLines={1}
                        style={[
                          styles.priorityText,
                          { color: isSelected ? colors.primaryContrast : colors.text },
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.rewardHeader}>
                <Text style={[styles.label, { color: colors.text }]}>Goal Reward</Text>
                <Text style={[styles.rateText, { color: colors.mutedText }]}>
                  Suggested: +{suggestedCoinAmount} from {task?.coinsPerHour ?? 0} coins/hr
                  {task?.isFocused ? ' · Focused' : ''}
                </Text>
              </View>
              <View style={styles.coinRow}>
                <TextInput
                  accessibilityLabel="Goal reward"
                  keyboardType="number-pad"
                  maxLength={9}
                  onChangeText={(value) => {
                    setCoinAmount(value);
                    setHasCoinOverride(true);
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.mutedText}
                  selectionColor={colors.primary}
                  style={[
                    styles.input,
                    styles.coinInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={coinAmount}
                />
                <Pressable
                  accessibilityLabel="Use suggested goal reward"
                  accessibilityRole="button"
                  disabled={isSubmitting || !durationIsValid}
                  onPress={() => {
                    setHasCoinOverride(false);
                    setCoinAmount(suggestedCoinAmount > 0 ? String(suggestedCoinAmount) : '');
                  }}
                  style={({ pressed }) => [
                    styles.suggestionButton,
                    { opacity: pressed || isSubmitting || !durationIsValid ? 0.55 : 1 },
                  ]}>
                  <MaterialIcons name="refresh" size={17} color={colors.primary} />
                  <Text style={[styles.suggestionText, { color: colors.primary }]}>Use suggested</Text>
                </Pressable>
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
                onPress={closeModal}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
                ]}>
                <Text style={[styles.secondaryText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!canSubmit}
                onPress={submitPlan}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: colors.primary, opacity: !canSubmit || pressed ? 0.55 : 1 },
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color={colors.primaryContrast} size="small" />
                ) : (
                  <>
                    <MaterialIcons name="today" size={19} color={colors.primaryContrast} />
                    <Text style={[styles.primaryText, { color: colors.primaryContrast }]}>Add to Today</Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  content: {
    alignSelf: 'center',
    gap: 24,
    maxWidth: 600,
    paddingBottom: 30,
    paddingHorizontal: 22,
    paddingTop: 16,
    width: '100%',
  },
  header: { alignItems: 'center', flexDirection: 'row' },
  headerText: { flex: 1, minWidth: 0, paddingRight: 12 },
  eyebrow: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  title: { fontFamily: Fonts.rounded, fontSize: 28, fontWeight: '700', lineHeight: 36 },
  category: { fontSize: 14, lineHeight: 20 },
  closeButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  input: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 18,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  helperText: { fontSize: 12, lineHeight: 18 },
  priorityGroup: { borderRadius: 8, flexDirection: 'row', gap: 4, padding: 4 },
  priorityButton: {
    alignItems: 'center',
    borderRadius: 7,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  priorityText: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  rewardHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  rateText: { fontSize: 12, lineHeight: 17 },
  coinRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  coinInput: { flex: 1, minWidth: 0 },
  suggestionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  suggestionText: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  errorText: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 17,
  },
  secondaryText: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 46,
    minWidth: 150,
    paddingHorizontal: 17,
  },
  primaryText: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
});
