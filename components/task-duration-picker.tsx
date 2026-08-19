import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, View } from 'react-native';

import { DurationWheelPicker } from '@/components/duration-wheel-picker';
import { useColorScheme } from '@/hooks/use-color-scheme';

type TaskDurationPickerProps = {
  hours: number;
  minutes: number;
  disabled?: boolean;
  onHoursChange: (hours: number) => void;
  onMinutesChange: (minutes: number) => void;
};

function createCountdownValue(hours: number, minutes: number): Date {
  return new Date(2000, 0, 1, hours, minutes, 0, 0);
}

export function TaskDurationPicker({
  hours,
  minutes,
  disabled = false,
  onHoursChange,
  onMinutesChange,
}: TaskDurationPickerProps) {
  const colorScheme = useColorScheme() ?? 'light';

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

  function handleChange(event: DateTimePickerEvent, selectedValue?: Date) {
    if (event.type === 'dismissed' || !selectedValue) {
      return;
    }

    onHoursChange(selectedValue.getHours());
    onMinutesChange(selectedValue.getMinutes());
  }

  return (
    <View style={[styles.nativePickerContainer, { opacity: disabled ? 0.55 : 1 }]}>
      <DateTimePicker
        accessibilityLabel={`Planned duration, ${hours} hours and ${minutes} minutes`}
        disabled={disabled}
        display="spinner"
        minuteInterval={1}
        mode="countdown"
        onChange={handleChange}
        style={styles.nativePicker}
        themeVariant={colorScheme}
        value={createCountdownValue(hours, minutes)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  nativePickerContainer: {
    alignSelf: 'center',
    height: 216,
    justifyContent: 'center',
    maxWidth: 360,
    overflow: 'hidden',
    width: '100%',
  },
  nativePicker: {
    height: 216,
    width: '100%',
  },
});
