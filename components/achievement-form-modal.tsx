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
import type { Achievement } from '@/models/types';

export type AchievementFormInput = {
  name: string;
  description?: string;
  coinBonus: number;
};

type AchievementFormModalProps = {
  visible: boolean;
  mode: 'add' | 'edit';
  initialValues?: Achievement | null;
  onRequestClose: () => void;
  onSubmit: (input: AchievementFormInput) => Promise<void>;
};

function isPositiveIntegerInput(value: string): boolean {
  const parsedValue = Number(value);

  return value.trim().length > 0 && Number.isInteger(parsedValue) && parsedValue > 0;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Achievement could not be saved. Please try again.';
}

export function AchievementFormModal({
  visible,
  mode,
  initialValues,
  onRequestClose,
  onSubmit,
}: AchievementFormModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coinBonus, setCoinBonus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const isEditMode = mode === 'edit';
  const canSubmit =
    name.trim().length > 0 && isPositiveIntegerInput(coinBonus) && !isSubmitting;

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(isEditMode && initialValues ? initialValues.name : '');
    setDescription(isEditMode && initialValues ? initialValues.description : '');
    setCoinBonus(isEditMode && initialValues ? String(initialValues.coinBonus) : '');
    setErrorMessage(null);
  }, [initialValues, isEditMode, visible]);

  function resetForm() {
    setName('');
    setDescription('');
    setCoinBonus('');
    setErrorMessage(null);
  }

  function closeModal() {
    if (isSubmittingRef.current) {
      return;
    }

    resetForm();
    onRequestClose();
  }

  async function submitAchievement() {
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
        coinBonus: Number(coinBonus),
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
              <View style={styles.headerText}>
                <Text style={[styles.eyebrow, { color: colors.mutedText }]}>Achievements</Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                  numberOfLines={1}
                  style={[styles.title, { color: colors.text }]}>
                  {isEditMode ? 'Edit Achievement' : 'Add Achievement'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close achievement form"
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
                <Text style={[styles.label, { color: colors.text }]}>Achievement name</Text>
                <TextInput
                  autoFocus
                  maxLength={120}
                  onChangeText={setName}
                  placeholder="Finished a difficult project"
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

              <View style={[styles.field, styles.bonusField]}>
                <Text style={[styles.label, { color: colors.text }]}>Coin bonus</Text>
                <TextInput
                  keyboardType="number-pad"
                  maxLength={9}
                  onChangeText={setCoinBonus}
                  placeholder="50"
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
                  value={coinBonus}
                />
              </View>
            </View>

            {errorMessage ? (
              <Text
                accessibilityRole="alert"
                style={[styles.errorText, { color: colors.danger }]}>
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
                onPress={submitAchievement}
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
                      {isEditMode ? 'Save' : 'Add Achievement'}
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
    gap: 22,
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
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  fields: {
    gap: 16,
  },
  field: {
    gap: 7,
  },
  bonusField: {
    maxWidth: 220,
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
  errorText: {
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
    minWidth: 164,
    paddingHorizontal: 17,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
});
