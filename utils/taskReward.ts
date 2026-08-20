type FocusedRewardInterval = {
  endSeconds: number | null;
  multiplier: number;
};

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;

export const FOCUSED_REWARD_CURVE: readonly FocusedRewardInterval[] = [
  { endSeconds: 30 * SECONDS_PER_MINUTE, multiplier: 0.8 },
  { endSeconds: 60 * SECONDS_PER_MINUTE, multiplier: 0.9 },
  { endSeconds: 90 * SECONDS_PER_MINUTE, multiplier: 1.1 },
  { endSeconds: 120 * SECONDS_PER_MINUTE, multiplier: 1.3 },
  { endSeconds: 150 * SECONDS_PER_MINUTE, multiplier: 1.45 },
  { endSeconds: 180 * SECONDS_PER_MINUTE, multiplier: 1.55 },
  { endSeconds: 210 * SECONDS_PER_MINUTE, multiplier: 1.25 },
  { endSeconds: 240 * SECONDS_PER_MINUTE, multiplier: 1 },
  { endSeconds: 270 * SECONDS_PER_MINUTE, multiplier: 0.75 },
  { endSeconds: 300 * SECONDS_PER_MINUTE, multiplier: 0.5 },
  { endSeconds: null, multiplier: 0.3 },
];

function validateDurationSeconds(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new Error('Task reward durationSeconds must be a finite number greater than or equal to 0.');
  }

  return durationSeconds;
}

function validateCoinsPerHour(coinsPerHour: number): number {
  if (!Number.isFinite(coinsPerHour) || coinsPerHour <= 0) {
    throw new Error('Task reward coinsPerHour must be a finite number greater than 0.');
  }

  return coinsPerHour;
}

export function calculateRawLinearTaskReward(
  durationSeconds: number,
  coinsPerHour: number
): number {
  const duration = validateDurationSeconds(durationSeconds);
  const hourlyRate = validateCoinsPerHour(coinsPerHour);

  return (duration * hourlyRate) / SECONDS_PER_HOUR;
}

export function calculateRawFocusedTaskReward(
  durationSeconds: number,
  coinsPerHour: number
): number {
  const duration = validateDurationSeconds(durationSeconds);
  const hourlyRate = validateCoinsPerHour(coinsPerHour);
  let intervalStart = 0;
  let rawReward = 0;

  for (const interval of FOCUSED_REWARD_CURVE) {
    if (duration <= intervalStart) {
      break;
    }

    const intervalEnd = interval.endSeconds ?? duration;
    const secondsInInterval = Math.min(duration, intervalEnd) - intervalStart;

    if (secondsInInterval > 0) {
      rawReward +=
        (secondsInInterval * hourlyRate * interval.multiplier) / SECONDS_PER_HOUR;
    }

    if (interval.endSeconds === null || duration <= intervalEnd) {
      break;
    }

    intervalStart = intervalEnd;
  }

  return rawReward;
}

export function calculateRawTaskReward(
  durationSeconds: number,
  coinsPerHour: number,
  isFocused: boolean
): number {
  if (typeof isFocused !== 'boolean') {
    throw new Error('Task reward isFocused must be a boolean.');
  }

  return isFocused
    ? calculateRawFocusedTaskReward(durationSeconds, coinsPerHour)
    : calculateRawLinearTaskReward(durationSeconds, coinsPerHour);
}

export function calculateSuggestedGoalReward(
  durationSeconds: number,
  coinsPerHour: number,
  isFocused: boolean
): number {
  return Math.ceil(calculateRawTaskReward(durationSeconds, coinsPerHour, isFocused));
}

export function calculateSuggestedGoalRewardForMinutes(
  durationMinutes: number,
  coinsPerHour: number,
  isFocused: boolean
): number {
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
    throw new Error('Task reward durationMinutes must be a finite number greater than or equal to 0.');
  }

  return calculateSuggestedGoalReward(
    durationMinutes * SECONDS_PER_MINUTE,
    coinsPerHour,
    isFocused
  );
}
