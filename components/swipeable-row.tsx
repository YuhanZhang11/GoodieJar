import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SwipeableRowProps = PropsWithChildren<{
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: (methods: SwipeableMethods) => void;
  onClose: (methods: SwipeableMethods) => void;
}>;

export function SwipeableRow({
  children,
  disabled,
  onEdit,
  onDelete,
  onOpen,
  onClose,
}: SwipeableRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const swipeableRef = useRef<SwipeableMethods>(null);

  useEffect(() => {
    if (disabled) {
      swipeableRef.current?.close();
    }
  }, [disabled]);

  function closeAndRun(action: () => void) {
    swipeableRef.current?.close();
    action();
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      dragOffsetFromRightEdge={12}
      enabled={!disabled}
      friction={1.6}
      rightThreshold={54}
      onSwipeableClose={() => {
        if (swipeableRef.current) {
          onClose(swipeableRef.current);
        }
      }}
      onSwipeableWillOpen={() => {
        if (swipeableRef.current) {
          onOpen(swipeableRef.current);
        }
      }}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit"
            disabled={disabled}
            onPress={() => closeAndRun(onEdit)}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.72 : 1 },
            ]}>
            <MaterialIcons name="edit" size={19} color={colors.primary} />
            <Text style={[styles.editText, { color: colors.primary }]}>Edit</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete"
            disabled={disabled}
            onPress={() => closeAndRun(onDelete)}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: colors.danger, opacity: pressed ? 0.76 : 1 },
            ]}>
            <MaterialIcons name="delete-outline" size={20} color={colors.dangerContrast} />
            <Text style={[styles.deleteText, { color: colors.dangerContrast }]}>Delete</Text>
          </Pressable>
        </View>
      )}
      childrenContainerStyle={{ backgroundColor: colors.background }}>
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    width: 148,
  },
  action: {
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    width: 74,
  },
  editText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
