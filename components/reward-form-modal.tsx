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

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Reward } from '@/models/types';
import type { CreateRewardInput } from '@/services/rewardService';

type RewardFormModalProps = {
  visible: boolean;
  mode: 'add' | 'edit';
  initialValues?: Reward | null;
  onRequestClose: () => void;
  onSubmit: (input: CreateRewardInput) => Promise<void>;
};

function isPositiveIntegerInput(value: string): boolean {
  const parsedValue = Number(value);

  return value.trim().length > 0 && Number.isInteger(parsedValue) && parsedValue > 0;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Reward could not be added. Please try again.';
}

export function RewardFormModal({
  visible,
  mode,
  initialValues,
  onRequestClose,
  onSubmit,
}: RewardFormModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coinCost, setCoinCost] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const isEditMode = mode === 'edit';
  const durationIsValid =
    estimatedDuration.trim().length === 0 || isPositiveIntegerInput(estimatedDuration);
  const canSubmit =
    name.trim().length > 0 &&
    isPositiveIntegerInput(coinCost) &&
    durationIsValid &&
    !isSubmitting;

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(isEditMode && initialValues ? initialValues.name : '');
    setDescription(isEditMode && initialValues ? initialValues.description : '');
    setCoinCost(isEditMode && initialValues ? String(initialValues.coinCost) : '');
    setEstimatedDuration(
      isEditMode && initialValues?.estimatedDurationMinutes !== null
        ? String(initialValues?.estimatedDurationMinutes ?? '')
        : ''
    );
    setErrorMessage(null);
  }, [initialValues, isEditMode, visible]);

  function resetForm() {
    setName('');
    setDescription('');
    setCoinCost('');
    setEstimatedDuration('');
    setErrorMessage(null);
  }

  function closeModal() {
    if (isSubmittingRef.current) {
      return;
    }

    resetForm();
    onRequestClose();
  }

  async function submitReward() {
    if (!canSubmit || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        name,
        description,
        coinCost: Number(coinCost),
        estimatedDurationMinutes:
          estimatedDuration.trim().length === 0 ? null : Number(estimatedDuration),
      });
      resetForm();
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
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.mutedText }]}>Rewards</Text>
                <Text style={[styles.title, { color: colors.text }]}>
                  {isEditMode ? 'Edit Reward' : 'Add Reward'}
                </Text>
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
                <Text style={[styles.label, { color: colors.text }]}>Reward name</Text>
                <TextInput
                  autoFocus
                  maxLength={120}
                  onChangeText={setName}
                  placeholder="Watch a movie"
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
                  <Text style={[styles.label, { color: colors.text }]}>Coin cost</Text>
                  <TextInput
                    keyboardType="number-pad"
                    maxLength={9}
                    onChangeText={setCoinCost}
                    placeholder="20"
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
                    value={coinCost}
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
                onPress={submitReward}
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
                    <MaterialIcons
                      name={isEditMode ? 'save' : 'add'}
                      size={20}
                      color={colors.primaryContrast}
                    />
                    <Text style={[styles.primaryButtonText, { color: colors.primaryContrast }]}>
                      {isEditMode ? 'Save' : 'Add Reward'}
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
    minWidth: 132,
    paddingHorizontal: 17,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
});
