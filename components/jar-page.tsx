import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JarHeader } from '@/components/jar-header';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type JarPageProps = PropsWithChildren<{
  balanceRefreshToken?: number;
}>;

type JarPagePlaceholderProps = {
  title: string;
  emptyTitle?: string;
  emptyMessage: string;
  actionLabel: string;
};

export function JarPage({ children, balanceRefreshToken = 0 }: JarPageProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.headerFrame}>
        <JarHeader refreshToken={balanceRefreshToken} />
      </View>
      <View style={[styles.contentBoundary, { borderTopColor: colors.border }]}>{children}</View>
    </SafeAreaView>
  );
}

export function JarPagePlaceholder({
  title,
  emptyTitle,
  emptyMessage,
  actionLabel,
}: JarPagePlaceholderProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ScrollView
      contentContainerStyle={styles.placeholderContent}
      showsVerticalScrollIndicator={false}>
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
          <Text style={[styles.actionText, { color: colors.primaryContrast }]}>{actionLabel}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerFrame: {
    alignSelf: 'center',
    maxWidth: 640,
    paddingBottom: 16,
    paddingHorizontal: 22,
    paddingTop: 10,
    width: '100%',
  },
  contentBoundary: {
    alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flex: 1,
    maxWidth: 640,
    width: '100%',
  },
  placeholderContent: {
    gap: 20,
    paddingBottom: 32,
    paddingHorizontal: 22,
    paddingTop: 18,
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
