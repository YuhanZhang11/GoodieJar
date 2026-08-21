import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CalendarEvent, CalendarEventKind } from '@/services/calendarService';

type CalendarDayModalProps = {
  date: string | null;
  events: CalendarEvent[];
  onRequestClose: () => void;
};

const EVENT_PRESENTATION: Record<
  CalendarEventKind,
  { icon: keyof typeof MaterialIcons.glyphMap; label: string }
> = {
  TASK: { icon: 'check-circle', label: 'Task' },
  DAILY_GOAL: { icon: 'flag', label: 'Daily Goal' },
  ACHIEVEMENT: { icon: 'emoji-events', label: 'Achievement' },
  REWARD: { icon: 'redeem', label: 'Reward' },
};

function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const currentYear = new Date().getFullYear();

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: year === currentYear ? undefined : 'numeric',
  }).format(date);
}

function formatPositiveAmount(amount: number): string {
  return amount === 0 ? '0' : `+${amount}`;
}

function formatNegativeAmount(amount: number): string {
  return amount === 0 ? '0' : `-${amount}`;
}

function formatNetGain(netGain: number): string {
  return netGain > 0 ? `+${netGain}` : String(netGain);
}

export function CalendarDayModal({ date, events, onRequestClose }: CalendarDayModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const summary = useMemo(() => {
    let totalEarned = 0;
    let totalSpent = 0;
    let achievementCoins = 0;

    for (const event of events) {
      if (event.kind === 'REWARD') {
        totalSpent += event.amount;
      } else {
        totalEarned += event.amount;

        if (event.kind === 'ACHIEVEMENT') {
          achievementCoins += event.amount;
        }
      }
    }

    return {
      totalEarned,
      totalSpent,
      achievementCoins,
      netGain: totalEarned - totalSpent,
    };
  }, [events]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onRequestClose}
      presentationStyle="pageSheet"
      visible={date !== null}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: colors.mutedText }]}>Calendar</Text>
            <Text style={[styles.title, { color: colors.text }]}>
              {date ? formatDateLabel(date) : ''}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close activity"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onRequestClose}
            style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.55 : 1 }]}>
            <MaterialIcons name="close" size={25} color={colors.icon} />
          </Pressable>
        </View>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <View style={[styles.netSection, { borderBottomColor: colors.border }]}>
            <View style={styles.netMetric}>
              <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>Net gain</Text>
              <Text
                style={[
                  styles.netAmount,
                  {
                    color:
                      summary.netGain < 0
                        ? colors.danger
                        : summary.netGain > 0
                          ? colors.primary
                          : colors.text,
                  },
                ]}>
                {formatNetGain(summary.netGain)}
              </Text>
            </View>
            <View style={styles.achievementMetric}>
              <Text style={[styles.metricLabel, { color: colors.mutedText }]}>Achievement</Text>
              <Text style={[styles.metricAmount, { color: colors.coinDeep }]}>
                {formatPositiveAmount(summary.achievementCoins)}
              </Text>
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={[styles.metricLabel, { color: colors.mutedText }]}>Earned</Text>
              <Text style={[styles.metricAmount, { color: colors.coinDeep }]}>
                {formatPositiveAmount(summary.totalEarned)}
              </Text>
            </View>
            <View
              style={[
                styles.metric,
                styles.dividedMetric,
                { borderLeftColor: colors.border },
              ]}>
              <Text style={[styles.metricLabel, { color: colors.mutedText }]}>Spent</Text>
              <Text style={[styles.metricAmount, { color: colors.coinDeep }]}>
                {formatNegativeAmount(summary.totalSpent)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.activityHeader}>
          <Text style={[styles.activityTitle, { color: colors.text }]}>Activity</Text>
          <Text style={[styles.activityCount, { color: colors.mutedText }]}>
            {events.length}
          </Text>
        </View>

        <FlatList
          contentContainerStyle={[
            styles.listContent,
            events.length === 0 ? styles.emptyListContent : null,
          ]}
          data={events}
          style={styles.activityList}
          keyExtractor={(event) => event.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="event-available" size={28} color={colors.mutedText} />
              <Text style={[styles.emptyText, { color: colors.mutedText }]}>
                No activity recorded for this day.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const presentation = EVENT_PRESENTATION[item.kind];
            const amountPrefix = item.kind === 'REWARD' ? '-' : '+';

            return (
              <View style={[styles.eventRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.iconFrame, { backgroundColor: colors.surfaceMuted }]}>
                  <MaterialIcons
                    name={presentation.icon}
                    size={21}
                    color={item.kind === 'ACHIEVEMENT' ? colors.coinDeep : colors.primary}
                  />
                </View>
                <View style={styles.eventContent}>
                  <Text style={[styles.kindLabel, { color: colors.mutedText }]}>
                    {presentation.label}
                  </Text>
                  <Text
                    ellipsizeMode="tail"
                    numberOfLines={1}
                    style={[styles.eventName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text
                      ellipsizeMode="tail"
                      numberOfLines={2}
                      style={[styles.description, { color: colors.mutedText }]}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.amount, { color: colors.coinDeep }]}>
                  {amountPrefix}
                  {item.amount}
                </Text>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 600,
    paddingHorizontal: 22,
    paddingTop: 16,
    width: '100%',
  },
  headerText: {
    flex: 1,
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
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  summaryCard: {
    alignSelf: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
    maxWidth: 556,
    paddingHorizontal: 16,
    width: '90%',
  },
  netSection: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 13,
  },
  netMetric: {
    flex: 1,
    minWidth: 0,
  },
  achievementMetric: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  netAmount: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  metric: {
    flex: 1,
    minWidth: 0,
  },
  dividedMetric: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: 16,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  metricAmount: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  activityHeader: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 600,
    paddingBottom: 6,
    paddingHorizontal: 22,
    paddingTop: 18,
    width: '100%',
  },
  activityTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
  },
  activityCount: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  activityList: {
    flex: 1,
  },
  listContent: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: 600,
    paddingBottom: 28,
    paddingHorizontal: 22,
    paddingTop: 0,
    width: '100%',
  },
  emptyListContent: {
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  eventRow: {
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 11,
    paddingVertical: 11,
  },
  iconFrame: {
    alignItems: 'center',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  eventContent: {
    flex: 1,
    minWidth: 0,
  },
  kindLabel: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  amount: {
    flexShrink: 0,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    paddingTop: 15,
  },
});
