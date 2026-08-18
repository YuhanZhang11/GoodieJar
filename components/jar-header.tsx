import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { JarVisual } from '@/components/jar-visual';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCurrentBalance } from '@/services/coinTransactionService';

type BalanceState =
  | { status: 'loading' }
  | { status: 'loaded'; balance: number }
  | { status: 'error' };

type JarHeaderProps = {
  refreshToken?: number;
};

export function JarHeader({ refreshToken = 0 }: JarHeaderProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [balanceState, setBalanceState] = useState<BalanceState>({ status: 'loading' });
  const latestBalanceRequestIdRef = useRef(0);
  const hasNegativeBalance = balanceState.status === 'loaded' && balanceState.balance < 0;

  const loadBalance = useCallback(() => {
    let isActive = true;
    const requestId = latestBalanceRequestIdRef.current + 1;
    latestBalanceRequestIdRef.current = requestId;

    setBalanceState({ status: 'loading' });
    getCurrentBalance()
      .then((balance) => {
        if (isActive && requestId === latestBalanceRequestIdRef.current) {
          setBalanceState({ status: 'loaded', balance });
        }
      })
      .catch(() => {
        if (isActive && requestId === latestBalanceRequestIdRef.current) {
          setBalanceState({ status: 'error' });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useFocusEffect(loadBalance);

  useEffect(() => {
    if (refreshToken === 0) {
      return;
    }

    return loadBalance();
  }, [loadBalance, refreshToken]);

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
          <MaterialIcons
            name={hasNegativeBalance ? 'money-off' : 'monetization-on'}
            size={22}
            color={hasNegativeBalance ? colors.danger : colors.coin}
          />
          {balanceState.status === 'loading' ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              numberOfLines={1}
              style={[
                styles.balanceText,
                { color: hasNegativeBalance ? colors.danger : colors.text },
              ]}>
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
    gap: 10,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    maxWidth: 560,
    width: '100%',
  },
  brand: {
    flexShrink: 1,
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
    flexShrink: 1,
    minHeight: 42,
    minWidth: 78,
    paddingHorizontal: 12,
  },
  balanceText: {
    flexShrink: 1,
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
