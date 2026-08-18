import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const PLACEHOLDER_DAYS = Array.from({ length: 35 }, (_, index) => index);

export default function CalendarScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.brand, { color: colors.mutedText }]}>GoodieJar</Text>
          <Text style={[styles.title, { color: colors.text }]}>History</Text>
        </View>

        <View
          style={[
            styles.calendar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <View style={styles.monthRow}>
            <MaterialIcons name="calendar-month" size={24} color={colors.primary} />
            <Text style={[styles.month, { color: colors.text }]}>{monthLabel}</Text>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((weekday, index) => (
              <Text key={`${weekday}-${index}`} style={[styles.weekday, { color: colors.mutedText }]}>
                {weekday}
              </Text>
            ))}
          </View>

          <View style={styles.dayGrid}>
            {PLACEHOLDER_DAYS.map((day) => (
              <View key={day} style={styles.dayCell}>
                <View style={[styles.dayPlaceholder, { backgroundColor: colors.surfaceMuted }]} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    alignSelf: 'center',
    gap: 30,
    maxWidth: 640,
    minHeight: '100%',
    paddingBottom: 36,
    paddingHorizontal: 22,
    paddingTop: 16,
    width: '100%',
  },
  header: {
    gap: 8,
  },
  brand: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 38,
  },
  calendar: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  monthRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginBottom: 21,
    paddingHorizontal: 4,
  },
  month: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
    width: '14.2857%',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
    width: '14.2857%',
  },
  dayPlaceholder: {
    borderRadius: 7,
    height: '58%',
    width: '58%',
  },
});
