import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { JarVisual } from '@/components/jar-visual';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCurrentBalance } from '@/services/coinTransactionService';

type BalanceState =
  | { status: 'loading' }
  | { status: 'loaded'; balance: number }
  | { status: 'error' };

export function JarHeader() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [balanceState, setBalanceState] = useState<BalanceState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;

    getCurrentBalance()
      .then((balance) => {
        if (isMounted) {
          setBalanceState({ status: 'loaded', balance });
        }
      })
      .catch(() => {
        if (isMounted) {
          setBalanceState({ status: 'error' });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={[styles.brand, { color: colors.text }]}>GoodieJar</Text>
        <View
          accessibilityLabel={
            balanceState.status === 'loaded'
              ? `Current balance: ${balanceState.balance} coins`
              : balanceState.status === 'error'
                ? 'Current balance unavailable'
                : 'Loading current balance'
          }
          style={[
            styles.balance,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <MaterialIcons name="monetization-on" size={24} color={colors.coin} />
          {balanceState.status === 'loading' ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={[styles.balanceText, { color: colors.text }]}>
              {balanceState.status === 'loaded' ? balanceState.balance.toLocaleString() : '--'}
            </Text>
          )}
        </View>
      </View>

      <JarVisual />

      {balanceState.status === 'error' ? (
        <Text style={[styles.errorText, { color: colors.mutedText }]}>Balance unavailable</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 560,
    width: '100%',
  },
  brand: {
    fontFamily: Fonts.rounded,
    fontSize: 29,
    fontWeight: '700',
    lineHeight: 36,
  },
  balance: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    minWidth: 76,
    paddingHorizontal: 12,
  },
  balanceText: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: -8,
  },
});
