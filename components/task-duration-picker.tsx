import { Picker } from '@react-native-picker/picker';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { DurationWheelPicker } from '@/components/duration-wheel-picker';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type TaskDurationPickerProps = {
  hours: number;
  minutes: number;
  disabled?: boolean;
  onHoursChange: (hours: number) => void;
  onMinutesChange: (minutes: number) => void;
};

const HOUR_VALUES = Array.from({ length: 24 }, (_, index) => index);
const MINUTE_VALUES = Array.from({ length: 60 }, (_, index) => index);

export function TaskDurationPicker({
  hours,
  minutes,
  disabled = false,
  onHoursChange,
  onMinutesChange,
}: TaskDurationPickerProps) {
  if (Platform.OS !== 'ios') {
    return (
      <DurationWheelPicker
        disabled={disabled}
        hours={hours}
        minutes={minutes}
        onHoursChange={onHoursChange}
        onMinutesChange={onMinutesChange}
      />
    );
  }

  return (
    <IOSDurationPicker
      disabled={disabled}
      hours={hours}
      minutes={minutes}
      onHoursChange={onHoursChange}
      onMinutesChange={onMinutesChange}
    />
  );
}

function IOSDurationPicker({
  hours,
  minutes,
  disabled = false,
  onHoursChange,
  onMinutesChange,
}: TaskDurationPickerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View
      pointerEvents={disabled ? 'none' : 'auto'}
      style={[styles.iosPickerContainer, { opacity: disabled ? 0.55 : 1 }]}>
      <View style={styles.iosPickerGroup}>
        <Picker<number>
          accessibilityLabel="Goal duration hours"
          accessibilityValue={{ text: `${hours} hours` }}
          enabled={!disabled}
          itemStyle={[styles.iosPickerItem, { color: colors.text }]}
          onValueChange={onHoursChange}
          selectedValue={hours}
          selectionColor={colors.surfaceMuted}
          style={[styles.iosPicker, { color: colors.text }]}>
          {HOUR_VALUES.map((value) => (
            <Picker.Item color={colors.text} key={value} label={String(value)} value={value} />
          ))}
        </Picker>
        <Text style={[styles.unitLabel, { color: colors.mutedText }]}>hours</Text>
      </View>

      <View style={styles.iosPickerGroup}>
        <Picker<number>
          accessibilityLabel="Goal duration minutes"
          accessibilityValue={{ text: `${minutes} minutes` }}
          enabled={!disabled}
          itemStyle={[styles.iosPickerItem, { color: colors.text }]}
          onValueChange={onMinutesChange}
          selectedValue={minutes}
          selectionColor={colors.surfaceMuted}
          style={[styles.iosPicker, { color: colors.text }]}>
          {MINUTE_VALUES.map((value) => (
            <Picker.Item color={colors.text} key={value} label={String(value)} value={value} />
          ))}
        </Picker>
        <Text style={[styles.unitLabel, { color: colors.mutedText }]}>min</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iosPickerContainer: {
    alignSelf: 'center',
    flexDirection: 'row',
    height: 216,
    justifyContent: 'center',
    maxWidth: 340,
    overflow: 'hidden',
    width: '100%',
  },
  iosPickerGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minWidth: 0,
  },
  iosPicker: {
    height: 216,
    width: 88,
  },
  iosPickerItem: {
    fontSize: 21,
  },
  unitLabel: {
    fontSize: 14,
    lineHeight: 20,
    width: 42,
  },
});
