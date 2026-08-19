import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TaskCategory } from '@/models/types';

type TaskCategoryPickerProps = {
  categories: TaskCategory[];
  selectedCategoryId: string;
  disabled: boolean;
  onChange: (categoryId: string) => void;
  onCreate: (name: string) => Promise<TaskCategory>;
  onUpdate: (category: TaskCategory, name: string) => Promise<TaskCategory>;
  onArchive: (category: TaskCategory) => Promise<void>;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Category could not be changed.';
}

export function TaskCategoryPicker({
  categories,
  selectedCategoryId,
  disabled,
  onChange,
  onCreate,
  onUpdate,
  onArchive,
}: TaskCategoryPickerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [showAdd, setShowAdd] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const isMutatingRef = useRef(false);

  useEffect(() => {
    if (selectedCategoryId && !categories.some((category) => category.id === selectedCategoryId)) {
      onChange('');
    }
  }, [categories, onChange, selectedCategoryId]);

  async function createCategory() {
    if (newName.trim().length === 0 || isMutatingRef.current) {
      return;
    }

    isMutatingRef.current = true;
    setIsMutating(true);
    setErrorMessage(null);

    try {
      const category = await onCreate(newName);
      onChange(category.id);
      setNewName('');
      setShowAdd(false);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
    }
  }

  async function renameCategory(category: TaskCategory) {
    if (editingName.trim().length === 0 || isMutatingRef.current) {
      return;
    }

    isMutatingRef.current = true;
    setIsMutating(true);
    setErrorMessage(null);

    try {
      await onUpdate(category, editingName);
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
    }
  }

  async function archiveCategory(category: TaskCategory) {
    if (isMutatingRef.current) {
      return;
    }

    isMutatingRef.current = true;
    setIsMutating(true);
    setErrorMessage(null);

    try {
      await onArchive(category);
      if (selectedCategoryId === category.id) {
        onChange('');
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
    }
  }

  function confirmArchive(category: TaskCategory) {
    Alert.alert(
      'Remove category?',
      `"${category.name}" will no longer be available for new task templates.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void archiveCategory(category),
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {categories.map((category) => {
          const isSelected = category.id === selectedCategoryId;

          return (
            <Pressable
              accessibilityLabel={`Category ${category.name}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: disabled || isMutating, selected: isSelected }}
              disabled={disabled || isMutating}
              key={category.id}
              onPress={() => onChange(category.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surfaceMuted,
                  borderColor: isSelected ? colors.primary : colors.border,
                  opacity: pressed || disabled || isMutating ? 0.62 : 1,
                },
              ]}>
              <Text
                numberOfLines={1}
                style={[styles.chipText, { color: isSelected ? colors.primaryContrast : colors.text }]}>
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tools}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled || isMutating}
          onPress={() => {
            setShowAdd((current) => !current);
            setErrorMessage(null);
          }}
          style={({ pressed }) => [styles.toolButton, { opacity: pressed ? 0.58 : 1 }]}>
          <MaterialIcons name="add" size={18} color={colors.primary} />
          <Text style={[styles.toolText, { color: colors.primary }]}>Add Category</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={disabled || isMutating}
          onPress={() => {
            setShowManage((current) => !current);
            setEditingId(null);
            setErrorMessage(null);
          }}
          style={({ pressed }) => [styles.toolButton, { opacity: pressed ? 0.58 : 1 }]}>
          <MaterialIcons name="tune" size={17} color={colors.primary} />
          <Text style={[styles.toolText, { color: colors.primary }]}>Manage Categories</Text>
        </Pressable>
      </View>

      {showAdd ? (
        <View style={styles.inlineEditor}>
          <TextInput
            autoCapitalize="words"
            editable={!disabled && !isMutating}
            maxLength={80}
            onChangeText={setNewName}
            onSubmitEditing={() => void createCategory()}
            placeholder="Category name"
            placeholderTextColor={colors.mutedText}
            returnKeyType="done"
            selectionColor={colors.primary}
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={newName}
          />
          <Pressable
            accessibilityRole="button"
            disabled={newName.trim().length === 0 || disabled || isMutating}
            onPress={() => void createCategory()}
            style={({ pressed }) => [
              styles.inlineButton,
              {
                backgroundColor: colors.primary,
                opacity: newName.trim().length === 0 || pressed || disabled || isMutating ? 0.52 : 1,
              },
            ]}>
            <Text style={[styles.inlineButtonText, { color: colors.primaryContrast }]}>Add</Text>
          </Pressable>
        </View>
      ) : null}

      {showManage ? (
        <View style={[styles.manageArea, { borderColor: colors.border }]}>
          <Text style={[styles.manageLabel, { color: colors.mutedText }]}>Categories</Text>
          {categories.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>No categories.</Text>
          ) : (
            categories.map((category) => (
              <View key={category.id} style={styles.manageRow}>
                {editingId === category.id ? (
                  <>
                    <TextInput
                      autoFocus
                      editable={!isMutating}
                      maxLength={80}
                      onChangeText={setEditingName}
                      onSubmitEditing={() => void renameCategory(category)}
                      returnKeyType="done"
                      selectionColor={colors.primary}
                      style={[
                        styles.input,
                        styles.renameInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                      value={editingName}
                    />
                    <Pressable
                      accessibilityLabel={`Save ${category.name} category`}
                      accessibilityRole="button"
                      disabled={editingName.trim().length === 0 || isMutating}
                      onPress={() => void renameCategory(category)}
                      style={styles.iconButton}>
                      <MaterialIcons name="check" size={21} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Cancel category rename"
                      accessibilityRole="button"
                      disabled={isMutating}
                      onPress={() => setEditingId(null)}
                      style={styles.iconButton}>
                      <MaterialIcons name="close" size={21} color={colors.icon} />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text
                      ellipsizeMode="tail"
                      numberOfLines={1}
                      style={[styles.manageName, { color: colors.text }]}>
                      {category.name}
                    </Text>
                    <Pressable
                      accessibilityLabel={`Rename ${category.name} category`}
                      accessibilityRole="button"
                      disabled={isMutating}
                      onPress={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                      }}
                      style={styles.iconButton}>
                      <MaterialIcons name="edit" size={19} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Remove ${category.name} category`}
                      accessibilityRole="button"
                      disabled={isMutating}
                      onPress={() => confirmArchive(category)}
                      style={styles.iconButton}>
                      <MaterialIcons name="remove-circle-outline" size={20} color={colors.danger} />
                    </Pressable>
                  </>
                )}
              </View>
            ))
          )}
        </View>
      ) : null}

      {errorMessage ? (
        <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.danger }]}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    maxWidth: '100%',
    minHeight: 40,
    paddingHorizontal: 11,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  tools: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 40,
    paddingRight: 7,
  },
  toolText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  inlineEditor: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontSize: 15,
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  inlineButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 15,
  },
  inlineButtonText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  manageArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 3,
    paddingTop: 9,
  },
  manageLabel: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: 5,
  },
  manageRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 44,
  },
  manageName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    minWidth: 0,
  },
  renameInput: {
    minHeight: 40,
  },
  iconButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
