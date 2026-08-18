import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { SwipeableRow } from '@/components/swipeable-row';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Reward } from '@/models/types';

type RewardListItemProps = {
  reward: Reward;
  isDisabled: boolean;
  isRedeeming: boolean;
  wasJustRedeemed: boolean;
  onRedeem: (reward: Reward) => void;
  onEdit: (reward: Reward) => void;
  onDelete: (reward: Reward) => void;
  onSwipeOpen: (methods: SwipeableMethods) => void;
  onSwipeClose: (methods: SwipeableMethods) => void;
};

export function RewardListItem({
  reward,
  isDisabled,
  isRedeeming,
  wasJustRedeemed,
  onRedeem,
  onEdit,
  onDelete,
  onSwipeOpen,
  onSwipeClose,
}: RewardListItemProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const description = reward.description.trim();
  const metadata = [
    reward.estimatedDurationMinutes === null ? null : `${reward.estimatedDurationMinutes} min`,
    description || null,
  ]
    .filter((value): value is string => value !== null)
    .join(' \u00B7 ');

  return (
    <SwipeableRow
      disabled={isDisabled}
      onClose={onSwipeClose}
      onDelete={() => onDelete(reward)}
      onEdit={() => onEdit(reward)}
      onOpen={onSwipeOpen}>
      <View style={[styles.container, { borderBottomColor: colors.border }]}>
        <View style={styles.primaryRow}>
          <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.name, { color: colors.text }]}>
            {reward.name}
          </Text>

          <View style={[styles.cost, { backgroundColor: colors.surfaceMuted }]}>
            <MaterialIcons name="monetization-on" size={17} color={colors.coin} />
            <Text style={[styles.costText, { color: colors.coinDeep }]}>-{reward.coinCost}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              wasJustRedeemed ? `${reward.name} redeemed` : `Redeem ${reward.name}`
            }
            disabled={isDisabled || wasJustRedeemed}
            onPress={() => onRedeem(reward)}
            style={({ pressed }) => [
              styles.redeemButton,
              {
                backgroundColor: wasJustRedeemed ? colors.surfaceMuted : colors.primary,
                opacity: pressed || isDisabled ? 0.7 : 1,
              },
            ]}>
            {isRedeeming ? (
              <ActivityIndicator color={colors.primaryContrast} size="small" />
            ) : (
              <>
                <MaterialIcons
                  name={wasJustRedeemed ? 'check' : 'redeem'}
                  size={17}
                  color={wasJustRedeemed ? colors.primary : colors.primaryContrast}
                />
                <Text
                  style={[
                    styles.redeemText,
                    { color: wasJustRedeemed ? colors.primary : colors.primaryContrast },
                  ]}>
                  {wasJustRedeemed ? 'Redeemed' : 'Redeem'}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {metadata ? (
          <Text
            ellipsizeMode="tail"
            numberOfLines={2}
            style={[styles.metadata, { color: colors.mutedText }]}>
            {metadata}
          </Text>
        ) : null}
      </View>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingVertical: 11,
  },
  primaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
    minWidth: 0,
  },
  cost: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 2,
    minHeight: 30,
    paddingHorizontal: 8,
  },
  costText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  redeemButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 3,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 8,
    width: 98,
  },
  redeemText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  metadata: {
    fontSize: 12,
    lineHeight: 18,
    paddingRight: 4,
  },
});
