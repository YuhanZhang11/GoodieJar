import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
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

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CreateTaskInput } from '@/services/taskService';

type TaskFormModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
};

function isPositiveIntegerInput(value: string): boolean {
  const parsedValue = Number(value);

  return value.trim().length > 0 && Number.isInteger(parsedValue) && parsedValue > 0;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Task could not be added. Please try again.';
}

export function TaskFormModal({ visible, onRequestClose, onSubmit }: TaskFormModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coinReward, setCoinReward] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const durationIsValid =
    estimatedDuration.trim().length === 0 || isPositiveIntegerInput(estimatedDuration);
  const canSubmit =
    name.trim().length > 0 &&
    isPositiveIntegerInput(coinReward) &&
    durationIsValid &&
    !isSubmitting;

  function resetForm() {
    setName('');
    setDescription('');
    setCoinReward('');
    setEstimatedDuration('');
    setErrorMessage(null);
  }

  function closeModal() {
    if (isSubmitting) {
      return;
    }

    resetForm();
    onRequestClose();
  }

  async function submitTask() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        name,
        description,
        coinReward: Number(coinReward),
        estimatedDurationMinutes:
          estimatedDuration.trim().length === 0 ? null : Number(estimatedDuration),
      });
      resetForm();
      onRequestClose();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
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
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.mutedText }]}>Tasks</Text>
                <Text style={[styles.title, { color: colors.text }]}>Add Task</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                hitSlop={10}
                onPress={closeModal}
                style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.55 : 1 }]}>
                <MaterialIcons name="close" size={25} color={colors.icon} />
              </Pressable>
            </View>

            <View style={styles.fields}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Task name</Text>
                <TextInput
                  autoFocus
                  maxLength={120}
                  onChangeText={setName}
                  placeholder="Study for tomorrow's class"
                  placeholderTextColor={colors.mutedText}
                  selectionColor={colors.primary}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={name}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Description</Text>
                <TextInput
                  maxLength={500}
                  multiline
                  onChangeText={setDescription}
                  placeholder="Optional details"
                  placeholderTextColor={colors.mutedText}
                  selectionColor={colors.primary}
                  style={[
                    styles.input,
                    styles.descriptionInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  textAlignVertical="top"
                  value={description}
                />
              </View>

              <View style={styles.numberFields}>
                <View style={[styles.field, styles.numberField]}>
                  <Text style={[styles.label, { color: colors.text }]}>Coin reward</Text>
                  <TextInput
                    keyboardType="number-pad"
                    maxLength={9}
                    onChangeText={setCoinReward}
                    placeholder="10"
                    placeholderTextColor={colors.mutedText}
                    selectionColor={colors.primary}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={coinReward}
                  />
                </View>

                <View style={[styles.field, styles.numberField]}>
                  <Text style={[styles.label, { color: colors.text }]}>Minutes</Text>
                  <TextInput
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={setEstimatedDuration}
                    placeholder="Optional"
                    placeholderTextColor={colors.mutedText}
                    selectionColor={colors.primary}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={estimatedDuration}
                  />
                </View>
              </View>
            </View>

            {errorMessage ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
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
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!canSubmit}
                onPress={submitTask}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: !canSubmit || pressed ? 0.55 : 1,
                  },
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color={colors.primaryContrast} size="small" />
                ) : (
                  <>
                    <MaterialIcons name="add" size={20} color={colors.primaryContrast} />
                    <Text style={[styles.primaryButtonText, { color: colors.primaryContrast }]}>
                      Add Task
                    </Text>
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
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    gap: 24,
    maxWidth: 600,
    paddingBottom: 30,
    paddingHorizontal: 22,
    paddingTop: 16,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  fields: {
    gap: 18,
  },
  field: {
    gap: 7,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  input: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  descriptionInput: {
    minHeight: 96,
  },
  numberFields: {
    flexDirection: 'row',
    gap: 12,
  },
  numberField: {
    flex: 1,
  },
  errorText: {
    color: '#B33A3A',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 17,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 46,
    minWidth: 120,
    paddingHorizontal: 17,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
});
