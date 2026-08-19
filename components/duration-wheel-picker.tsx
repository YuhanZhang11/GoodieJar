import { useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type DurationWheelPickerProps = {
  hours: number;
  minutes: number;
  disabled?: boolean;
  onHoursChange: (hours: number) => void;
  onMinutesChange: (minutes: number) => void;
};

type WheelColumnProps = {
  accessibilityLabel: string;
  values: number[];
  value: number;
  unit: string;
  disabled: boolean;
  onChange: (value: number) => void;
};

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const VERTICAL_PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

function WheelColumn({
  accessibilityLabel,
  values,
  value,
  unit,
  disabled,
  onChange,
}: WheelColumnProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ animated: false, y: value * ITEM_HEIGHT });
  }, [value]);

  function selectOffset(offsetY: number) {
    const nextIndex = Math.max(0, Math.min(values.length - 1, Math.round(offsetY / ITEM_HEIGHT)));
    onChange(values[nextIndex]);
  }

  function finishScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    selectOffset(event.nativeEvent.contentOffset.y);
  }

  function finishDrag(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (Math.abs(event.nativeEvent.velocity?.y ?? 0) < 0.01) {
      finishScroll(event);
    }
  }

  function handleAccessibilityAction(event: AccessibilityActionEvent) {
    const direction = event.nativeEvent.actionName === 'increment' ? 1 : -1;
    const nextIndex = Math.max(0, Math.min(values.length - 1, values.indexOf(value) + direction));
    selectValue(values[nextIndex]);
  }

  function selectValue(nextValue: number) {
    onChange(nextValue);
    scrollRef.current?.scrollTo({ animated: true, y: nextValue * ITEM_HEIGHT });
  }

  return (
    <View
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={{ text: `${value} ${unit}` }}
      accessible
      onAccessibilityAction={handleAccessibilityAction}
      style={[styles.column, { borderColor: colors.border }]}>
      <View
        pointerEvents="none"
        style={[
          styles.selectionBand,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
          },
        ]}
      />
      <ScrollView
        ref={scrollRef}
        accessibilityLabel={accessibilityLabel}
        contentContainerStyle={styles.wheelContent}
        decelerationRate="fast"
        disableIntervalMomentum
        nestedScrollEnabled
        onMomentumScrollEnd={finishScroll}
        onScrollEndDrag={finishDrag}
        scrollEnabled={!disabled}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={ITEM_HEIGHT}
        style={styles.wheel}>
        {values.map((item) => {
          const isSelected = item === value;

          return (
            <Pressable
              accessibilityLabel={`${item} ${unit}`}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected: isSelected }}
              disabled={disabled}
              key={item}
              onPress={() => selectValue(item)}
              style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  {
                    color: isSelected ? colors.text : colors.mutedText,
                    fontWeight: isSelected ? '700' : '500',
                    opacity: isSelected ? 1 : 0.58,
                  },
                ]}>
                {item}
                {isSelected ? ` ${unit}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function DurationWheelPicker({
  hours,
  minutes,
  disabled = false,
  onHoursChange,
  onMinutesChange,
}: DurationWheelPickerProps) {
  return (
    <View style={styles.container}>
      <WheelColumn
        accessibilityLabel="Planned duration hours"
        disabled={disabled}
        onChange={onHoursChange}
        unit="hr"
        value={hours}
        values={HOURS}
      />
      <WheelColumn
        accessibilityLabel="Planned duration minutes"
        disabled={disabled}
        onChange={onMinutesChange}
        unit="min"
        value={minutes}
        values={MINUTES}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
    maxWidth: 340,
    width: '100%',
  },
  column: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    height: WHEEL_HEIGHT,
    minWidth: 0,
    overflow: 'hidden',
  },
  selectionBand: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: ITEM_HEIGHT,
    left: 0,
    position: 'absolute',
    right: 0,
    top: VERTICAL_PADDING,
  },
  wheel: {
    flex: 1,
  },
  wheelContent: {
    paddingVertical: VERTICAL_PADDING,
  },
  item: {
    alignItems: 'center',
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  itemText: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
});
