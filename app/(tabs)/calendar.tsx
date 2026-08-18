import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarDayModal } from '@/components/calendar-day-modal';
import {
  CalendarPeriodSelector,
  type CalendarSelectorMode,
} from '@/components/calendar-period-selector';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getCalendarEventsForMonth,
  type CalendarEvent,
} from '@/services/calendarService';
import { getLocalDateKey } from '@/utils/localDate';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type LoadState = 'loading' | 'loaded' | 'error';

type VisibleMonth = {
  year: number;
  monthIndex: number;
};

type CalendarCell = {
  day: number;
  date: string;
} | null;

function getCurrentMonth(): VisibleMonth {
  const today = new Date();

  return { year: today.getFullYear(), monthIndex: today.getMonth() };
}

function getMonthName(month: VisibleMonth): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
  }).format(new Date(month.year, month.monthIndex, 1));
}

function getCalendarCells(month: VisibleMonth): CalendarCell[] {
  const firstWeekday = new Date(month.year, month.monthIndex, 1).getDay();
  const daysInMonth = new Date(month.year, month.monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - firstWeekday + 1;

    if (day < 1 || day > daysInMonth) {
      return null;
    }

    return {
      day,
      date: getLocalDateKey(new Date(month.year, month.monthIndex, day)),
    };
  });
}

function getCalendarRows(cells: CalendarCell[]): CalendarCell[][] {
  const rows: CalendarCell[][] = [];

  for (let index = 0; index < cells.length; index += 7) {
    rows.push(cells.slice(index, index + 7));
  }

  return rows;
}

function getAccessibleDateLabel(month: VisibleMonth, day: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  }).format(new Date(month.year, month.monthIndex, day));
}

export default function CalendarScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [visibleMonth, setVisibleMonth] = useState<VisibleMonth>(getCurrentMonth);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectorMode, setSelectorMode] = useState<CalendarSelectorMode | null>(null);
  const loadRequestIdRef = useRef(0);

  const loadMonth = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoadState('loading');

    try {
      const monthEvents = await getCalendarEventsForMonth(
        visibleMonth.year,
        visibleMonth.monthIndex
      );

      if (requestId === loadRequestIdRef.current) {
        setEvents(monthEvents);
        setLoadState('loaded');
      }
    } catch {
      if (requestId === loadRequestIdRef.current) {
        setEvents([]);
        setLoadState('error');
      }
    }
  }, [visibleMonth.monthIndex, visibleMonth.year]);

  useFocusEffect(
    useCallback(() => {
      void loadMonth();

      return () => {
        loadRequestIdRef.current += 1;
      };
    }, [loadMonth])
  );

  const eventsByDate = useMemo(() => {
    const groupedEvents = new Map<string, CalendarEvent[]>();

    for (const event of events) {
      const dateEvents = groupedEvents.get(event.date) ?? [];
      dateEvents.push(event);
      groupedEvents.set(event.date, dateEvents);
    }

    return groupedEvents;
  }, [events]);

  const calendarRows = useMemo(
    () => getCalendarRows(getCalendarCells(visibleMonth)),
    [visibleMonth]
  );
  const today = getLocalDateKey(new Date());
  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];

  function prepareForMonthChange() {
    loadRequestIdRef.current += 1;
    setSelectedDate(null);
    setEvents([]);
    setLoadState('loading');
  }

  function navigateMonth(offset: number) {
    prepareForMonthChange();
    setVisibleMonth((currentMonth) => {
      const nextMonth = new Date(currentMonth.year, currentMonth.monthIndex + offset, 1);

      return {
        year: nextMonth.getFullYear(),
        monthIndex: nextMonth.getMonth(),
      };
    });
  }

  function selectMonth(monthIndex: number) {
    setSelectorMode(null);
    setSelectedDate(null);

    if (monthIndex === visibleMonth.monthIndex) {
      return;
    }

    prepareForMonthChange();
    setVisibleMonth((currentMonth) => ({ ...currentMonth, monthIndex }));
  }

  function selectYear(year: number) {
    setSelectorMode(null);
    setSelectedDate(null);

    if (year === visibleMonth.year) {
      return;
    }

    prepareForMonthChange();
    setVisibleMonth((currentMonth) => ({ ...currentMonth, year }));
  }

  function goToToday() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthIndex = currentDate.getMonth();

    setSelectorMode(null);
    setSelectedDate(null);

    if (
      visibleMonth.year === currentYear &&
      visibleMonth.monthIndex === currentMonthIndex
    ) {
      loadRequestIdRef.current += 1;
      void loadMonth();
      return;
    }

    prepareForMonthChange();
    setVisibleMonth({ year: currentYear, monthIndex: currentMonthIndex });
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>Calendar</Text>
          <Pressable
            accessibilityLabel="Go to today"
            accessibilityRole="button"
            onPress={goToToday}
            style={({ pressed }) => [
              styles.todayButton,
              { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.65 : 1 },
            ]}>
            <Text style={[styles.todayButtonText, { color: colors.primary }]}>Today</Text>
          </Pressable>
        </View>

        <View style={styles.monthHeader}>
          <Pressable
            accessibilityLabel="Previous month"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => navigateMonth(-1)}
            style={({ pressed }) => [
              styles.monthButton,
              {
                backgroundColor: colors.surfaceMuted,
                opacity: pressed ? 0.62 : 1,
              },
            ]}>
            <MaterialIcons name="chevron-left" size={25} color={colors.primary} />
          </Pressable>
          <View style={styles.periodControls}>
            <Pressable
              accessibilityLabel={`Choose month, current month ${getMonthName(visibleMonth)}`}
              accessibilityRole="button"
              onPress={() => setSelectorMode('month')}
              style={({ pressed }) => [
                styles.periodButton,
                { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.65 : 1 },
              ]}>
              <Text numberOfLines={1} style={[styles.periodText, { color: colors.text }]}>
                {getMonthName(visibleMonth)}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Choose year, current year ${visibleMonth.year}`}
              accessibilityRole="button"
              onPress={() => setSelectorMode('year')}
              style={({ pressed }) => [
                styles.periodButton,
                { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.65 : 1 },
              ]}>
              <Text style={[styles.periodText, { color: colors.text }]}>{visibleMonth.year}</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityLabel="Next month"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => navigateMonth(1)}
            style={({ pressed }) => [
              styles.monthButton,
              {
                backgroundColor: colors.surfaceMuted,
                opacity: pressed ? 0.62 : 1,
              },
            ]}>
            <MaterialIcons name="chevron-right" size={25} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.calendar}>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((weekday) => (
              <Text key={weekday} style={[styles.weekday, { color: colors.mutedText }]}>
                {weekday}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarRows.map((row, rowIndex) => (
              <View key={`week-${rowIndex}`} style={styles.weekRow}>
                {row.map((cell, columnIndex) => {
                  if (!cell) {
                    return <View key={`blank-${columnIndex}`} style={styles.daySlot} />;
                  }

                  const hasActivity = eventsByDate.has(cell.date);
                  const isToday = cell.date === today;

                  return (
                    <View key={cell.date} style={styles.daySlot}>
                      <Pressable
                        accessibilityLabel={`${getAccessibleDateLabel(visibleMonth, cell.day)}${
                          hasActivity ? ', has activity' : ''
                        }`}
                        accessibilityRole="button"
                        onPress={() => setSelectedDate(cell.date)}
                        style={({ pressed }) => [
                          styles.dayButton,
                          {
                            backgroundColor: isToday ? colors.surfaceMuted : 'transparent',
                            borderColor: isToday ? colors.primary : 'transparent',
                            opacity: pressed ? 0.58 : 1,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.dayNumber,
                            { color: isToday ? colors.primary : colors.text },
                          ]}>
                          {cell.day}
                        </Text>
                        {hasActivity ? (
                          <View style={[styles.activityDot, { backgroundColor: colors.coin }]} />
                        ) : null}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {loadState === 'loading' ? (
          <View style={styles.statusState}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={[styles.statusText, { color: colors.mutedText }]}>Loading activity...</Text>
          </View>
        ) : null}

        {loadState === 'error' ? (
          <View style={styles.statusState}>
            <Text style={[styles.errorTitle, { color: colors.text }]}>Calendar unavailable</Text>
            <Text style={[styles.statusText, { color: colors.mutedText }]}>Please try again.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadMonth()}
              style={({ pressed }) => [
                styles.retryButton,
                { borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
              ]}>
              <MaterialIcons name="refresh" size={18} color={colors.primary} />
              <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <CalendarDayModal
        date={selectedDate}
        events={selectedEvents}
        onRequestClose={() => setSelectedDate(null)}
      />
      <CalendarPeriodSelector
        mode={selectorMode}
        onClose={() => setSelectorMode(null)}
        onSelectMonth={selectMonth}
        onSelectYear={selectYear}
        selectedMonthIndex={visibleMonth.monthIndex}
        selectedYear={visibleMonth.year}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    alignSelf: 'center',
    maxWidth: 640,
    minHeight: '100%',
    paddingBottom: 32,
    paddingHorizontal: 22,
    paddingTop: 16,
    width: '100%',
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 38,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  todayButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 13,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 24,
  },
  monthButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  periodControls: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minWidth: 0,
  },
  periodButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    minHeight: 38,
    paddingHorizontal: 10,
  },
  periodText: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    maxWidth: 96,
    textAlign: 'center',
  },
  calendar: {
    marginTop: 24,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 17,
    textAlign: 'center',
  },
  grid: {
    marginTop: 7,
  },
  daySlot: {
    aspectRatio: 1,
    flex: 1,
    padding: 3,
  },
  dayButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  activityDot: {
    borderRadius: 3,
    bottom: 6,
    height: 5,
    position: 'absolute',
    width: 5,
  },
  statusState: {
    alignItems: 'center',
    gap: 7,
    minHeight: 86,
    paddingTop: 20,
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  retryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 5,
    marginTop: 3,
    minHeight: 38,
    paddingHorizontal: 13,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
});
