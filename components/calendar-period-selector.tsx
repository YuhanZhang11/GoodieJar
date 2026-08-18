import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type CalendarSelectorMode = 'month' | 'year';

type CalendarPeriodSelectorProps = {
  mode: CalendarSelectorMode | null;
  selectedMonthIndex: number;
  selectedYear: number;
  onClose: () => void;
  onSelectMonth: (monthIndex: number) => void;
  onSelectYear: (year: number) => void;
};

const YEAR_PAGE_SIZE = 12;
const MIN_CALENDAR_YEAR = 1000;
const MAX_CALENDAR_YEAR = 9999;

function getYearPageStart(year: number): number {
  const boundedYear = Math.min(Math.max(year, MIN_CALENDAR_YEAR), MAX_CALENDAR_YEAR);

  return (
    MIN_CALENDAR_YEAR +
    Math.floor((boundedYear - MIN_CALENDAR_YEAR) / YEAR_PAGE_SIZE) * YEAR_PAGE_SIZE
  );
}

export function CalendarPeriodSelector({
  mode,
  selectedMonthIndex,
  selectedYear,
  onClose,
  onSelectMonth,
  onSelectYear,
}: CalendarPeriodSelectorProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [yearPageStart, setYearPageStart] = useState(() => getYearPageStart(selectedYear));
  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) =>
        new Intl.DateTimeFormat(undefined, { month: 'short' }).format(
          new Date(2020, monthIndex, 1)
        )
      ),
    []
  );
  const visibleYears = useMemo(
    () =>
      Array.from({ length: YEAR_PAGE_SIZE }, (_, index) => yearPageStart + index).filter(
        (year) => year <= MAX_CALENDAR_YEAR
      ),
    [yearPageStart]
  );

  useEffect(() => {
    if (mode === 'year') {
      setYearPageStart(getYearPageStart(selectedYear));
    }
  }, [mode, selectedYear]);

  const isMonthMode = mode === 'month';
  const title = isMonthMode ? 'Choose Month' : 'Choose Year';
  const canShowPreviousYears = yearPageStart > MIN_CALENDAR_YEAR;
  const canShowNextYears = yearPageStart + YEAR_PAGE_SIZE <= MAX_CALENDAR_YEAR;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={mode !== null}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.mutedText }]}>Calendar</Text>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            </View>
            <Pressable
              accessibilityLabel="Close selector"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.55 : 1 }]}>
              <MaterialIcons name="close" size={25} color={colors.icon} />
            </Pressable>
          </View>

          {isMonthMode ? (
            <View style={styles.grid}>
              {monthLabels.map((monthLabel, monthIndex) => {
                const isSelected = monthIndex === selectedMonthIndex;

                return (
                  <View key={monthIndex} style={styles.gridCell}>
                    <Pressable
                      accessibilityLabel={`Select ${monthLabel}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => onSelectMonth(monthIndex)}
                      style={({ pressed }) => [
                        styles.option,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceMuted,
                          borderColor: isSelected ? colors.primary : colors.border,
                          opacity: pressed ? 0.68 : 1,
                        },
                      ]}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.optionText,
                          { color: isSelected ? colors.primaryContrast : colors.text },
                        ]}>
                        {monthLabel}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <>
              <View style={styles.rangeHeader}>
                <Pressable
                  accessibilityLabel="Previous year range"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canShowPreviousYears }}
                  disabled={!canShowPreviousYears}
                  onPress={() => setYearPageStart((currentStart) => currentStart - YEAR_PAGE_SIZE)}
                  style={({ pressed }) => [
                    styles.rangeButton,
                    {
                      backgroundColor: colors.surfaceMuted,
                      opacity: !canShowPreviousYears || pressed ? 0.5 : 1,
                    },
                  ]}>
                  <MaterialIcons name="chevron-left" size={24} color={colors.primary} />
                </Pressable>
                <Text style={[styles.rangeLabel, { color: colors.text }]}>
                  {yearPageStart} - {Math.min(yearPageStart + YEAR_PAGE_SIZE - 1, MAX_CALENDAR_YEAR)}
                </Text>
                <Pressable
                  accessibilityLabel="Next year range"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canShowNextYears }}
                  disabled={!canShowNextYears}
                  onPress={() => setYearPageStart((currentStart) => currentStart + YEAR_PAGE_SIZE)}
                  style={({ pressed }) => [
                    styles.rangeButton,
                    {
                      backgroundColor: colors.surfaceMuted,
                      opacity: !canShowNextYears || pressed ? 0.5 : 1,
                    },
                  ]}>
                  <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
                </Pressable>
              </View>

              <View style={styles.grid}>
                {visibleYears.map((year) => {
                  const isSelected = year === selectedYear;

                  return (
                    <View key={year} style={styles.gridCell}>
                      <Pressable
                        accessibilityLabel={`Select ${year}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => onSelectYear(year)}
                        style={({ pressed }) => [
                          styles.option,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceMuted,
                            borderColor: isSelected ? colors.primary : colors.border,
                            opacity: pressed ? 0.68 : 1,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.optionText,
                            { color: isSelected ? colors.primaryContrast : colors.text },
                          ]}>
                          {year}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelButton,
              { borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
            ]}>
            <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 560,
    paddingBottom: 28,
    paddingHorizontal: 22,
    paddingTop: 16,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  rangeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  rangeButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  rangeLabel: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 24,
  },
  gridCell: {
    padding: 4,
    width: '33.3333%',
  },
  option: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 8,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
});
