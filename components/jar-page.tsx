import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JarHeader } from '@/components/jar-header';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type JarPageProps = {
  title: string;
  emptyTitle?: string;
  emptyMessage: string;
  actionLabel: string;
};

export function JarPage({ title, emptyTitle, emptyMessage, actionLabel }: JarPageProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}>
        <JarHeader />

        <View style={[styles.content, { borderTopColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <View style={styles.emptyState}>
            {emptyTitle ? (
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyTitle}</Text>
            ) : null}
            <Text style={[styles.emptyMessage, { color: colors.mutedText }]}>{emptyMessage}</Text>
            <View
              pointerEvents="none"
              style={[styles.action, { backgroundColor: colors.primary }]}
              accessibilityElementsHidden>
              <MaterialIcons name="add" size={20} color={colors.primaryContrast} />
              <Text style={[styles.actionText, { color: colors.primaryContrast }]}>
                {actionLabel}
              </Text>
            </View>
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
    gap: 20,
    maxWidth: 640,
    minHeight: '100%',
    paddingBottom: 32,
    paddingHorizontal: 22,
    paddingTop: 10,
    width: '100%',
  },
  content: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 20,
    paddingTop: 20,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  emptyState: {
    alignItems: 'flex-start',
    gap: 9,
    minHeight: 156,
    paddingBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 23,
  },
  emptyMessage: {
    fontSize: 15,
    lineHeight: 22,
  },
  action: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    minHeight: 42,
    paddingHorizontal: 15,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
});
