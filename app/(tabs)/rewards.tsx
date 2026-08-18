import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { JarPage } from '@/components/jar-page';
import { RewardFormModal } from '@/components/reward-form-modal';
import { RewardListItem } from '@/components/reward-list-item';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Reward } from '@/models/types';
import { redeemReward } from '@/services/rewardRedemptionService';
import {
  archiveReward,
  createReward,
  getActiveRewards,
  updateReward,
  type CreateRewardInput,
} from '@/services/rewardService';

type LoadState = 'loading' | 'loaded' | 'error';
type RewardFormState = { mode: 'add' } | { mode: 'edit'; reward: Reward };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The reward could not be redeemed.';
}

export default function RewardsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [rewardFormState, setRewardFormState] = useState<RewardFormState | null>(null);
  const [redeemingRewardId, setRedeemingRewardId] = useState<string | null>(null);
  const [archivingRewardId, setArchivingRewardId] = useState<string | null>(null);
  const [justRedeemedRewardId, setJustRedeemedRewardId] = useState<string | null>(null);
  const [balanceRefreshToken, setBalanceRefreshToken] = useState(0);
  const redeemingRewardIdRef = useRef<string | null>(null);
  const archivingRewardIdRef = useRef<string | null>(null);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRewards = useCallback(async () => {
    setLoadState('loading');

    try {
      const activeRewards = await getActiveRewards();
      setRewards(activeRewards);
      setLoadState('loaded');
    } catch {
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRewards();
    }, [loadRewards])
  );

  useEffect(() => {
    return () => {
      if (successTimer.current !== null) {
        clearTimeout(successTimer.current);
      }
    };
  }, []);

  async function addReward(input: CreateRewardInput) {
    const createdReward = await createReward(input);

    setRewards((currentRewards) => [
      createdReward,
      ...currentRewards.filter((reward) => reward.id !== createdReward.id),
    ]);
    setLoadState('loaded');
    void loadRewards();
  }

  async function submitRewardForm(input: CreateRewardInput) {
    if (rewardFormState?.mode !== 'edit') {
      await addReward(input);
      return;
    }

    const updatedReward = await updateReward(rewardFormState.reward.id, input);

    if (!updatedReward) {
      throw new Error('Reward no longer exists.');
    }

    setRewards((currentRewards) =>
      currentRewards.map((reward) => (reward.id === updatedReward.id ? updatedReward : reward))
    );
    setLoadState('loaded');
    void loadRewards();
  }

  async function redeemSelectedReward(reward: Reward) {
    if (
      redeemingRewardIdRef.current !== null ||
      archivingRewardIdRef.current !== null ||
      justRedeemedRewardId === reward.id
    ) {
      return;
    }

    openSwipeableRef.current?.close();
    redeemingRewardIdRef.current = reward.id;
    setRedeemingRewardId(reward.id);

    try {
      await redeemReward({ rewardId: reward.id });
      setBalanceRefreshToken((currentToken) => currentToken + 1);
      setJustRedeemedRewardId(reward.id);

      if (successTimer.current !== null) {
        clearTimeout(successTimer.current);
      }

      successTimer.current = setTimeout(() => {
        setJustRedeemedRewardId(null);
        successTimer.current = null;
      }, 1800);
    } catch (error) {
      Alert.alert('Could not redeem reward', getErrorMessage(error));
    } finally {
      redeemingRewardIdRef.current = null;
      setRedeemingRewardId(null);
    }
  }

  function openRewardFormForAdd() {
    openSwipeableRef.current?.close();
    setRewardFormState({ mode: 'add' });
  }

  function openRewardFormForEdit(reward: Reward) {
    if (redeemingRewardIdRef.current !== null || archivingRewardIdRef.current !== null) {
      return;
    }

    setRewardFormState({ mode: 'edit', reward });
  }

  async function archiveSelectedReward(reward: Reward) {
    if (redeemingRewardIdRef.current !== null || archivingRewardIdRef.current !== null) {
      return;
    }

    archivingRewardIdRef.current = reward.id;
    setArchivingRewardId(reward.id);

    try {
      const archivedReward = await archiveReward(reward.id);

      if (!archivedReward) {
        throw new Error('Reward no longer exists.');
      }

      setRewards((currentRewards) =>
        currentRewards.filter((currentReward) => currentReward.id !== reward.id)
      );
    } catch (error) {
      Alert.alert('Could not delete reward', getErrorMessage(error));
    } finally {
      archivingRewardIdRef.current = null;
      setArchivingRewardId(null);
    }
  }

  function confirmDeleteReward(reward: Reward) {
    if (redeemingRewardIdRef.current !== null || archivingRewardIdRef.current !== null) {
      return;
    }

    Alert.alert(
      'Delete reward?',
      `"${reward.name}" will be removed from your Rewards.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void archiveSelectedReward(reward),
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
          <Text style={[styles.messageText, { color: colors.mutedText }]}>Loading rewards...</Text>
        </View>
      );
    }

    if (loadState === 'error') {
      return (
        <View style={styles.messageState}>
          <Text style={[styles.messageTitle, { color: colors.text }]}>Rewards unavailable</Text>
          <Text style={[styles.messageText, { color: colors.mutedText }]}>Please try again.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadRewards()}
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
        <Text style={[styles.messageTitle, { color: colors.text }]}>No rewards yet.</Text>
      </View>
    );
  }

  return (
    <JarPage balanceRefreshToken={balanceRefreshToken}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={rewards}
        keyExtractor={(reward) => reward.id}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          <View style={[styles.sectionHeader, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Rewards</Text>
            <Pressable
              accessibilityRole="button"
              onPress={openRewardFormForAdd}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: colors.surface, opacity: pressed ? 0.65 : 1 },
              ]}>
              <MaterialIcons name="add" size={19} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Add</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <RewardListItem
            isDisabled={redeemingRewardId !== null || archivingRewardId !== null}
            isRedeeming={redeemingRewardId === item.id}
            onDelete={confirmDeleteReward}
            onEdit={openRewardFormForEdit}
            onRedeem={(reward) => void redeemSelectedReward(reward)}
            onSwipeClose={clearOpenSwipeable}
            onSwipeOpen={registerOpenSwipeable}
            reward={item}
            wasJustRedeemed={justRedeemedRewardId === item.id}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <RewardFormModal
        initialValues={rewardFormState?.mode === 'edit' ? rewardFormState.reward : null}
        mode={rewardFormState?.mode ?? 'add'}
        onRequestClose={() => setRewardFormState(null)}
        onSubmit={submitRewardForm}
        visible={rewardFormState !== null}
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
    marginBottom: 4,
    marginTop: 12,
    minHeight: 46,
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
    minHeight: 34,
    paddingHorizontal: 10,
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
    minHeight: 38,
    paddingHorizontal: 13,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
});
