import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TaskCategoryPicker } from '@/components/task-category-picker';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Task, TaskCategory } from '@/models/types';

export type TaskTemplateFormInput = {
  name: string;
  description: string;
  categoryId: string;
  coinsPerHour: number;
  isFocused: boolean;
};

type TaskFormModalProps = {
  visible: boolean;
  mode: 'add' | 'edit';
  initialValues?: Task | null;
  categories: TaskCategory[];
  defaultCategoryId: string;
  onRequestClose: () => void;
  onSubmit: (input: TaskTemplateFormInput) => Promise<void>;
  onCreateCategory: (name: string) => Promise<TaskCategory>;
  onUpdateCategory: (category: TaskCategory, name: string) => Promise<TaskCategory>;
  onArchiveCategory: (category: TaskCategory) => Promise<void>;
};

function isPositiveIntegerInput(value: string): boolean {
  const parsedValue = Number(value);

  return value.trim().length > 0 && Number.isInteger(parsedValue) && parsedValue > 0;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Task could not be saved. Please try again.';
}

export function TaskFormModal({
  visible,
  mode,
  initialValues,
  categories,
  defaultCategoryId,
  onRequestClose,
  onSubmit,
  onCreateCategory,
  onUpdateCategory,
  onArchiveCategory,
}: TaskFormModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [coinsPerHour, setCoinsPerHour] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const isEditMode = mode === 'edit';
  const hasActiveCategory = categories.some((category) => category.id === categoryId);
  const canSubmit =
    name.trim().length > 0 &&
    hasActiveCategory &&
    isPositiveIntegerInput(coinsPerHour) &&
    !isSubmitting;

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(isEditMode && initialValues ? initialValues.name : '');
    setDescription(isEditMode && initialValues ? initialValues.description : '');
    setCategoryId(isEditMode && initialValues ? initialValues.categoryId : defaultCategoryId);
    setCoinsPerHour(isEditMode && initialValues ? String(initialValues.coinsPerHour) : '');
    setIsFocused(isEditMode && initialValues ? initialValues.isFocused : false);
    setErrorMessage(null);
  }, [defaultCategoryId, initialValues, isEditMode, visible]);

  function resetForm() {
    setName('');
    setDescription('');
    setCategoryId('');
    setCoinsPerHour('');
    setIsFocused(false);
    setErrorMessage(null);
  }

  function closeModal() {
    if (isSubmittingRef.current) {
      return;
    }

    resetForm();
    onRequestClose();
  }

  async function submitTask() {
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
        categoryId,
        coinsPerHour: Number(coinsPerHour),
        isFocused,
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
                <Text style={[styles.eyebrow, { color: colors.mutedText }]}>Task Library</Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                  numberOfLines={1}
                  style={[styles.title, { color: colors.text }]}>
                  {isEditMode ? 'Edit Task' : 'Create Task'}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close task form"
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
                    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
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
                    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                  ]}
                  textAlignVertical="top"
                  value={description}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Category</Text>
                <TaskCategoryPicker
                  categories={categories}
                  disabled={isSubmitting}
                  key={`${visible ? 'open' : 'closed'}-${mode}-${initialValues?.id ?? 'new'}`}
                  onArchive={onArchiveCategory}
                  onChange={setCategoryId}
                  onCreate={onCreateCategory}
                  onUpdate={onUpdateCategory}
                  selectedCategoryId={categoryId}
                />
                {!hasActiveCategory ? (
                  <Text style={[styles.helperText, { color: colors.danger }]}>Choose an active category.</Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Base Coins / Hour</Text>
                <TextInput
                  accessibilityLabel="Base coins per hour"
                  keyboardType="number-pad"
                  maxLength={9}
                  onChangeText={setCoinsPerHour}
                  placeholder="40"
                  placeholderTextColor={colors.mutedText}
                  selectionColor={colors.primary}
                  style={[
                    styles.input,
                    styles.coinInput,
                    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                  ]}
                  value={coinsPerHour}
                />
              </View>

              <View style={[styles.focusedRow, { borderColor: colors.border }]}>
                <View style={styles.focusedTextBlock}>
                  <View style={styles.focusedLabelRow}>
                    <Text style={[styles.label, { color: colors.text }]}>Focused</Text>
                    <Pressable
                      accessibilityLabel="About Focused mode"
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() =>
                        Alert.alert(
                          'Focused mode',
                          'Focused mode rewards sustained concentration. Rewards start below your base rate during the first hour, increase during 1-3 hours of focused work, then gradually decrease afterward to encourage productive work and healthy breaks.'
                        )
                      }
                      style={({ pressed }) => [styles.infoButton, { opacity: pressed ? 0.55 : 1 }]}>
                      <MaterialIcons name="info-outline" size={19} color={colors.primary} />
                    </Pressable>
                  </View>
                  <Text style={[styles.focusedHint, { color: colors.mutedText }]}>
                    Use the sustained-focus reward curve.
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Focused reward mode"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: isFocused, disabled: isSubmitting }}
                  disabled={isSubmitting}
                  ios_backgroundColor={colors.border}
                  onValueChange={setIsFocused}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  value={isFocused}
                />
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
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!canSubmit}
                onPress={submitTask}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: colors.primary, opacity: !canSubmit || pressed ? 0.55 : 1 },
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
                      {isEditMode ? 'Save' : 'Create Task'}
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
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  content: {
    alignSelf: 'center',
    gap: 22,
    maxWidth: 600,
    paddingBottom: 30,
    paddingHorizontal: 22,
    paddingTop: 16,
    width: '100%',
  },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerText: { flex: 1, minWidth: 0, paddingRight: 12 },
  eyebrow: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  title: { fontFamily: Fonts.rounded, fontSize: 28, fontWeight: '700', lineHeight: 36 },
  closeButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
  fields: { gap: 16 },
  field: { gap: 7 },
  label: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  input: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  descriptionInput: { minHeight: 92 },
  coinInput: { maxWidth: 180 },
  focusedRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    paddingVertical: 8,
  },
  focusedTextBlock: { flex: 1, gap: 1, minWidth: 0 },
  focusedLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  focusedHint: { fontSize: 12, lineHeight: 17 },
  infoButton: { alignItems: 'center', height: 32, justifyContent: 'center', width: 32 },
  helperText: { fontSize: 12, lineHeight: 17 },
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
  secondaryButtonText: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
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
  primaryButtonText: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
});
