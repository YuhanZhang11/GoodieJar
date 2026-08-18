import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import {
  AchievementFormModal,
  type AchievementFormInput,
} from '@/components/achievement-form-modal';
import { AchievementListItem } from '@/components/achievement-list-item';
import { JarPage } from '@/components/jar-page';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Achievement } from '@/models/types';
import {
  deleteRecordedAchievement,
  editRecordedAchievement,
} from '@/services/achievementCorrectionService';
import { recordAchievement } from '@/services/achievementRecordingService';
import { getActiveAchievements } from '@/services/achievementService';

type LoadState = 'loading' | 'loaded' | 'error';
type AchievementFormState =
  | { mode: 'add' }
  | { mode: 'edit'; achievement: Achievement };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The Achievement could not be changed.';
}

export default function AchievementsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [achievementFormState, setAchievementFormState] =
    useState<AchievementFormState | null>(null);
  const [mutatingAchievementId, setMutatingAchievementId] = useState<string | null>(null);
  const [balanceRefreshToken, setBalanceRefreshToken] = useState(0);
  const mutatingAchievementIdRef = useRef<string | null>(null);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  const loadAchievements = useCallback(async () => {
    setLoadState('loading');

    try {
      const activeAchievements = await getActiveAchievements();
      setAchievements(activeAchievements);
      setLoadState('loaded');
    } catch {
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAchievements();
    }, [loadAchievements])
  );

  async function addAchievement(input: AchievementFormInput) {
    const result = await recordAchievement(input);

    setAchievements((currentAchievements) => [
      result.achievement,
      ...currentAchievements.filter(
        (achievement) => achievement.id !== result.achievement.id
      ),
    ]);
    setLoadState('loaded');
    setBalanceRefreshToken((currentToken) => currentToken + 1);
    void loadAchievements();
  }

  async function submitAchievementForm(input: AchievementFormInput) {
    if (achievementFormState?.mode !== 'edit') {
      await addAchievement(input);
      return;
    }

    if (mutatingAchievementIdRef.current !== null) {
      throw new Error('Another Achievement change is already in progress.');
    }

    const achievementId = achievementFormState.achievement.id;
    mutatingAchievementIdRef.current = achievementId;
    setMutatingAchievementId(achievementId);

    try {
      const result = await editRecordedAchievement({
        achievementId,
        name: input.name,
        description: input.description,
        coinBonus: input.coinBonus,
      });

      setAchievements((currentAchievements) =>
        currentAchievements.map((achievement) =>
          achievement.id === result.achievement.id ? result.achievement : achievement
        )
      );
      setLoadState('loaded');
      setBalanceRefreshToken((currentToken) => currentToken + 1);
      void loadAchievements();
    } finally {
      mutatingAchievementIdRef.current = null;
      setMutatingAchievementId(null);
    }
  }

  function openAchievementFormForAdd() {
    if (mutatingAchievementIdRef.current !== null) {
      return;
    }

    openSwipeableRef.current?.close();
    setAchievementFormState({ mode: 'add' });
  }

  function openAchievementFormForEdit(achievement: Achievement) {
    if (mutatingAchievementIdRef.current !== null) {
      return;
    }

    setAchievementFormState({ mode: 'edit', achievement });
  }

  async function deleteSelectedAchievement(achievement: Achievement) {
    if (mutatingAchievementIdRef.current !== null) {
      return;
    }

    mutatingAchievementIdRef.current = achievement.id;
    setMutatingAchievementId(achievement.id);

    try {
      await deleteRecordedAchievement({ achievementId: achievement.id });
      setAchievements((currentAchievements) =>
        currentAchievements.filter(
          (currentAchievement) => currentAchievement.id !== achievement.id
        )
      );
      setBalanceRefreshToken((currentToken) => currentToken + 1);
    } catch (error) {
      Alert.alert('Could not delete achievement', getErrorMessage(error));
    } finally {
      mutatingAchievementIdRef.current = null;
      setMutatingAchievementId(null);
    }
  }

  function confirmDeleteAchievement(achievement: Achievement) {
    if (mutatingAchievementIdRef.current !== null) {
      return;
    }

    Alert.alert(
      'Delete achievement?',
      `"${achievement.name}" will be removed from your Achievements.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteSelectedAchievement(achievement),
        },
      ]
    );
  }

  function registerOpenSwipeable(methods: SwipeableMethods) {
    if (openSwipeableRef.current !== methods) {
      openSwipeableRef.current?.close();
      openSwipeableRef.current = methods;
    }
  }

  function clearOpenSwipeable(methods: SwipeableMethods) {
    if (openSwipeableRef.current === methods) {
      openSwipeableRef.current = null;
    }
  }

  function renderEmptyState() {
    if (loadState === 'loading') {
      return (
        <View style={styles.messageState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.messageText, { color: colors.mutedText }]}>
            Loading achievements...
          </Text>
        </View>
      );
    }

    if (loadState === 'error') {
      return (
        <View style={styles.messageState}>
          <Text style={[styles.messageTitle, { color: colors.text }]}>Achievements unavailable</Text>
          <Text style={[styles.messageText, { color: colors.mutedText }]}>Please try again.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadAchievements()}
            style={({ pressed }) => [
              styles.retryButton,
              { borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
            ]}>
            <MaterialIcons name="refresh" size={18} color={colors.primary} />
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.messageState}>
        <Text style={[styles.messageTitle, { color: colors.text }]}>No achievements yet.</Text>
      </View>
    );
  }

  return (
    <JarPage balanceRefreshToken={balanceRefreshToken}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={achievements}
        keyExtractor={(achievement) => achievement.id}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          <View style={[styles.sectionHeader, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
            <Pressable
              accessibilityLabel="Add achievement"
              accessibilityRole="button"
              disabled={mutatingAchievementId !== null}
              onPress={openAchievementFormForAdd}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: colors.surface,
                  opacity: pressed || mutatingAchievementId !== null ? 0.65 : 1,
                },
              ]}>
              <MaterialIcons name="add" size={19} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Add</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <AchievementListItem
            achievement={item}
            isDisabled={mutatingAchievementId !== null}
            onDelete={confirmDeleteAchievement}
            onEdit={openAchievementFormForEdit}
            onSwipeClose={clearOpenSwipeable}
            onSwipeOpen={registerOpenSwipeable}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <AchievementFormModal
        initialValues={
          achievementFormState?.mode === 'edit' ? achievementFormState.achievement : null
        }
        mode={achievementFormState?.mode ?? 'add'}
        onRequestClose={() => setAchievementFormState(null)}
        onSubmit={submitAchievementForm}
        visible={achievementFormState !== null}
      />
    </JarPage>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: 28,
    paddingHorizontal: 22,
  },
  sectionHeader: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sectionTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  addButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 3,
    minHeight: 40,
    paddingHorizontal: 11,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  messageState: {
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    minHeight: 150,
    paddingHorizontal: 20,
  },
  messageTitle: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 23,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
    minHeight: 40,
    paddingHorizontal: 13,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
});
