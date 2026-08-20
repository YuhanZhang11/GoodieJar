import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TaskSessionDetails } from '@/services/taskSessionService';
import {
  calculateTaskSessionGoalProgress,
  formatActiveFocusTime,
  formatActiveFocusTimeAccessibilityLabel,
  getTaskSessionState,
} from '@/utils/taskSession';

type TaskFocusSessionModalProps = {
  details: TaskSessionDetails | null;
  isMutating: boolean;
  visible: boolean;
  onExtend: () => void;
  onPause: () => void;
  onRequestClose: () => void;
  onResume: () => void;
  onStop: () => void;
};

export function TaskFocusSessionModal({
  details,
  isMutating,
  visible,
  onExtend,
  onPause,
  onRequestClose,
  onResume,
  onStop,
}: TaskFocusSessionModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [now, setNow] = useState(() => new Date());
  const state = details ? getTaskSessionState(details.session) : null;
  const progress = details ? calculateTaskSessionGoalProgress(details.session, now) : null;
  const isRunning = state === 'RUNNING';
  const isExtended = Boolean(details?.session.extendedAt);
  const showGoalReached = Boolean(progress?.goalReached && !isExtended);
  const canStop = !isMutating;

  useEffect(() => {
    if (!visible || !details) {
      return;
    }

    setNow(new Date());

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setNow(new Date());
      }
    });
    const interval = isRunning
      ? setInterval(() => {
          setNow(new Date());
        }, 1000)
      : null;

    return () => {
      appStateSubscription.remove();

      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [details, isRunning, visible]);

  if (!details || state === 'COMPLETED') {
    return null;
  }

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
              <Text style={[styles.eyebrow, { color: colors.mutedText }]}>Focus session</Text>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                numberOfLines={2}
                style={[styles.title, { color: colors.text }]}>
                {details.planDetails.task.name}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close focus session"
              accessibilityRole="button"
              disabled={isMutating}
              hitSlop={10}
              onPress={onRequestClose}
              style={({ pressed }) => [
                styles.closeButton,
                { opacity: pressed || isMutating ? 0.55 : 1 },
              ]}>
              <MaterialIcons name="close" size={25} color={colors.icon} />
            </Pressable>
          </View>

          <View style={styles.sessionBody}>
            <View style={styles.stateGroup}>
              <View style={[styles.statePill, { backgroundColor: colors.surfaceMuted }]}>
                {showGoalReached || isExtended ? (
                  <MaterialIcons name="check-circle" size={17} color={colors.primary} />
                ) : (
                  <View
                    style={[
                      styles.stateDot,
                      { backgroundColor: isRunning ? colors.primary : colors.mutedText },
                    ]}
                  />
                )}
                <Text style={[styles.stateText, { color: colors.text }]}>
                  {showGoalReached
                    ? 'Goal reached'
                    : isExtended
                      ? 'Extended'
                      : isRunning
                        ? 'Focus in progress'
                        : 'Paused'}
                </Text>
              </View>
              {(showGoalReached || isExtended) && !isRunning ? (
                <Text style={[styles.pausedText, { color: colors.mutedText }]}>Paused</Text>
              ) : null}
              <Text
                accessibilityLabel={formatActiveFocusTimeAccessibilityLabel(
                  progress?.activeSeconds ?? 0
                )}
                accessible
                style={[styles.activeTime, { color: colors.mutedText }]}>
                {formatActiveFocusTime(progress?.activeSeconds ?? 0)}
              </Text>
            </View>

            {isExtended ? (
              <View style={styles.extendedRewards}>
                <View
                  accessibilityLabel={`Extra Earned ${progress?.extraCoinAmount ?? 0} coins`}
                  accessible
                  style={[styles.compactRewardPanel, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.rewardLabel, { color: colors.mutedText }]}>Extra Earned</Text>
                  <Text style={[styles.compactRewardValue, { color: colors.coinDeep }]}>
                    +{progress?.extraCoinAmount ?? 0}
                  </Text>
                </View>
                <View
                  accessibilityLabel={`Total Earned ${progress?.coinAmount ?? 0} coins`}
                  accessible
                  style={[styles.compactRewardPanel, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.rewardLabel, { color: colors.mutedText }]}>Total Earned</Text>
                  <Text style={[styles.compactRewardValue, { color: colors.coinDeep }]}>
                    +{progress?.coinAmount ?? 0}
                  </Text>
                </View>
              </View>
            ) : (
              <View
                accessibilityLabel={`${showGoalReached ? 'Goal Reward' : 'Reward Earned'} ${
                  showGoalReached
                    ? progress?.goalRewardCoinAmount ?? 0
                    : progress?.coinAmount ?? 0
                } coins`}
                accessible
                style={[styles.rewardPanel, { backgroundColor: colors.surface }]}>
                <Text style={[styles.rewardLabel, { color: colors.mutedText }]}>
                  {showGoalReached ? 'Goal Reward' : 'Reward Earned'}
                </Text>
                <View style={styles.rewardValueRow}>
                  <MaterialIcons name="monetization-on" size={29} color={colors.coin} />
                  <Text style={[styles.rewardValue, { color: colors.coinDeep }]}>
                    {`+${
                      showGoalReached
                        ? progress?.goalRewardCoinAmount ?? 0
                        : progress?.coinAmount ?? 0
                    }`}
                  </Text>
                </View>
              </View>
            )}
            {!progress?.goalReached &&
            isRunning &&
            details.session.goalNotificationId === null ? (
              <Text style={[styles.notificationNote, { color: colors.mutedText }]}>
                Background goal reminder unavailable. In-app goal tracking will continue.
              </Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            {showGoalReached ? (
              <>
                <Pressable
                  accessibilityLabel="Stop focus session"
                  accessibilityRole="button"
                  disabled={!canStop}
                  onPress={onStop}
                  style={({ pressed }) => [
                    styles.stopButton,
                    {
                      borderColor: colors.danger,
                      opacity: pressed || !canStop ? 0.5 : 1,
                    },
                  ]}>
                  <MaterialIcons name="stop" size={21} color={colors.danger} />
                  <Text style={[styles.stopButtonText, { color: colors.danger }]}>Stop</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Extend focus session"
                  accessibilityRole="button"
                  disabled={isMutating}
                  onPress={onExtend}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: pressed || isMutating ? 0.58 : 1,
                    },
                  ]}>
                  {isMutating ? (
                    <ActivityIndicator color={colors.primaryContrast} size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="add" size={21} color={colors.primaryContrast} />
                      <Text style={[styles.primaryButtonText, { color: colors.primaryContrast }]}>
                        Extend
                      </Text>
                    </>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityLabel={isRunning ? 'Pause focus session' : 'Resume focus session'}
                  accessibilityRole="button"
                  disabled={isMutating}
                  onPress={isRunning ? onPause : onResume}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: pressed || isMutating ? 0.58 : 1,
                    },
                  ]}>
                  {isMutating ? (
                    <ActivityIndicator color={colors.primaryContrast} size="small" />
                  ) : (
                    <>
                      <MaterialIcons
                        name={isRunning ? 'pause' : 'play-arrow'}
                        size={21}
                        color={colors.primaryContrast}
                      />
                      <Text style={[styles.primaryButtonText, { color: colors.primaryContrast }]}>
                        {isRunning ? 'Pause' : 'Resume'}
                      </Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  accessibilityLabel="Stop focus session"
                  accessibilityRole="button"
                  disabled={!canStop}
                  onPress={onStop}
                  style={({ pressed }) => [
                    styles.stopButton,
                    {
                      borderColor: colors.danger,
                      opacity: pressed || !canStop ? 0.5 : 1,
                    },
                  ]}>
                  <MaterialIcons name="stop" size={21} color={colors.danger} />
                  <Text style={[styles.stopButtonText, { color: colors.danger }]}>Stop</Text>
                </Pressable>
              </>
            )}
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
    justifyContent: 'space-between',
    maxWidth: 600,
    paddingBottom: 28,
    paddingHorizontal: 22,
    paddingTop: 16,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerText: { flex: 1, minWidth: 0, paddingRight: 12 },
  eyebrow: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 35,
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sessionBody: { alignItems: 'center', gap: 20 },
  stateGroup: { alignItems: 'center', gap: 6 },
  statePill: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 14,
  },
  stateDot: { borderRadius: 5, height: 9, width: 9 },
  stateText: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  pausedText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  activeTime: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    lineHeight: 20,
  },
  rewardPanel: {
    alignItems: 'center',
    borderRadius: 8,
    minWidth: 210,
    paddingHorizontal: 26,
    paddingVertical: 24,
  },
  rewardLabel: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  rewardValueRow: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 5 },
  rewardValue: {
    fontFamily: Fonts.rounded,
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 50,
  },
  extendedRewards: { flexDirection: 'row', gap: 10, width: '100%' },
  compactRewardPanel: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  compactRewardValue: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    marginTop: 3,
  },
  notificationNote: {
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 300,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: 10 },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  stopButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  stopButtonText: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
});
