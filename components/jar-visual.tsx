import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const COINS = [
  { left: 34, bottom: 20, size: 34, rotation: '-8deg' },
  { left: 65, bottom: 13, size: 38, rotation: '5deg' },
  { left: 100, bottom: 21, size: 33, rotation: '10deg' },
  { left: 52, bottom: 47, size: 31, rotation: '-4deg' },
  { left: 84, bottom: 45, size: 35, rotation: '7deg' },
] as const;

export function JarVisual() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="GoodieJar coin jar"
      style={styles.container}>
      <View style={[styles.lidTop, { backgroundColor: colors.jarLid }]} />
      <View
        style={[
          styles.lidBand,
          { backgroundColor: colors.surface, borderColor: colors.jarOutline },
        ]}
      />
      <View
        style={[
          styles.jarBody,
          { backgroundColor: colors.jarGlass, borderColor: colors.jarOutline },
        ]}>
        <View style={[styles.glassHighlight, { backgroundColor: colors.surface }]} />
        {COINS.map((coin, index) => (
          <MaterialIcons
            key={index}
            name="monetization-on"
            size={coin.size}
            color={colors.coin}
            style={[
              styles.coin,
              {
                left: coin.left,
                bottom: coin.bottom,
                transform: [{ rotate: coin.rotation }],
              },
            ]}
          />
        ))}
        <View style={[styles.jarLabel, { backgroundColor: colors.surface }]}>
          <MaterialIcons name="favorite" size={22} color={colors.primary} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: 205,
    justifyContent: 'flex-end',
    width: 210,
  },
  lidTop: {
    borderRadius: 6,
    height: 10,
    width: 104,
  },
  lidBand: {
    borderRadius: 7,
    borderWidth: 3,
    height: 19,
    marginBottom: -2,
    width: 122,
    zIndex: 2,
  },
  jarBody: {
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 3,
    height: 158,
    overflow: 'hidden',
    position: 'relative',
    width: 176,
  },
  glassHighlight: {
    borderRadius: 6,
    height: 78,
    left: 18,
    opacity: 0.42,
    position: 'absolute',
    top: 19,
    width: 9,
  },
  coin: {
    position: 'absolute',
  },
  jarLabel: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    left: 61,
    position: 'absolute',
    top: 38,
    width: 48,
  },
});
