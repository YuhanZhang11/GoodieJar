import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { SwipeableRow } from '@/components/swipeable-row';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Achievement } from '@/models/types';

type AchievementListItemProps = {
  achievement: Achievement;
  isDisabled: boolean;
  onEdit: (achievement: Achievement) => void;
  onDelete: (achievement: Achievement) => void;
  onSwipeOpen: (methods: SwipeableMethods) => void;
  onSwipeClose: (methods: SwipeableMethods) => void;
};

function formatAchievedDate(timestamp: string): string {
  const achievedDate = new Date(timestamp);
  const currentYear = new Date().getFullYear();

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: achievedDate.getFullYear() === currentYear ? undefined : 'numeric',
  }).format(achievedDate);
}

export function AchievementListItem({
  achievement,
  isDisabled,
  onEdit,
  onDelete,
  onSwipeOpen,
  onSwipeClose,
}: AchievementListItemProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const description = achievement.description.trim();
  const metadata = [formatAchievedDate(achievement.achievedAt), description || null]
    .filter((value): value is string => value !== null)
    .join(' \u00B7 ');

  return (
    <SwipeableRow
      disabled={isDisabled}
      onClose={onSwipeClose}
      onDelete={() => onDelete(achievement)}
      onEdit={() => onEdit(achievement)}
      onOpen={onSwipeOpen}>
      <View style={[styles.container, { borderBottomColor: colors.border }]}>
        <View style={styles.primaryRow}>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.name, { color: colors.text }]}>
            {achievement.name}
          </Text>
          <View style={[styles.bonus, { backgroundColor: colors.surfaceMuted }]}>
            <MaterialIcons name="monetization-on" size={17} color={colors.coin} />
            <Text style={[styles.bonusText, { color: colors.text }]}>+{achievement.coinBonus}</Text>
          </View>
        </View>
        <Text
          ellipsizeMode="tail"
          numberOfLines={2}
          style={[styles.metadata, { color: colors.mutedText }]}>
          {metadata}
        </Text>
      </View>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 5,
    paddingVertical: 10,
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
  bonus: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 2,
    minHeight: 28,
    paddingHorizontal: 7,
  },
  bonusText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  metadata: {
    fontSize: 12,
    lineHeight: 17,
    paddingRight: 4,
  },
});
