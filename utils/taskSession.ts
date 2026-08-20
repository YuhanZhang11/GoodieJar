import type { TaskSession } from '@/models/types';
import { calculateRawTaskReward } from '@/utils/taskReward';
import { parseTimestamp } from '@/utils/timestamp';

export type TaskSessionState = 'RUNNING' | 'PAUSED' | 'COMPLETED';

export type TaskSessionReward = {
  activeSeconds: number;
  baseRawReward: number;
  rewardScale: number;
  adjustedRawReward: number;
  coinAmount: number;
};

export type TaskSessionGoalProgress = TaskSessionReward & {
  goalReached: boolean;
  goalRewardCoinAmount: number;
  extraCoinAmount: number;
};

function getActiveFocusTimeParts(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    throw new Error('Active focus time must be finite and non-negative.');
  }

  const wholeSeconds = Math.floor(totalSeconds);

  return {
    hours: Math.floor(wholeSeconds / 3600),
    minutes: Math.floor((wholeSeconds % 3600) / 60),
    seconds: wholeSeconds % 60,
  };
}

export function formatActiveFocusTime(totalSeconds: number): string {
  const { hours, minutes, seconds } = getActiveFocusTimeParts(totalSeconds);

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

export function formatActiveFocusTimeAccessibilityLabel(totalSeconds: number): string {
  const { hours, minutes, seconds } = getActiveFocusTimeParts(totalSeconds);

  return `Active focus time ${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} ${
    minutes === 1 ? 'minute' : 'minutes'
  } ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
}

export function getTaskSessionState(session: TaskSession): TaskSessionState {
  if (session.endedAt !== null) {
    return 'COMPLETED';
  }

  return session.activeStartedAt === null ? 'PAUSED' : 'RUNNING';
}

export function calculateTaskSessionActiveSeconds(
  session: TaskSession,
  now: Date = new Date()
): number {
  if (!Number.isFinite(session.accumulatedSeconds) || session.accumulatedSeconds < 0) {
    throw new Error('TaskSession accumulatedSeconds must be finite and non-negative.');
  }

  if (Number.isNaN(now.getTime())) {
    throw new Error('TaskSession current time must be valid.');
  }

  if (getTaskSessionState(session) !== 'RUNNING' || session.activeStartedAt === null) {
    return session.accumulatedSeconds;
  }

  const activeStartedAt = parseTimestamp(
    session.activeStartedAt,
    'TaskSession activeStartedAt'
  ).date;
  const runningSeconds = Math.max(0, (now.getTime() - activeStartedAt.getTime()) / 1000);

  return session.accumulatedSeconds + runningSeconds;
}

export function calculateTaskSessionRewardScale(session: TaskSession): number {
  const acceptedSuggestion =
    session.plannedCoinAmountSnapshot === session.suggestedCoinAmountSnapshot;

  if (acceptedSuggestion) {
    return 1;
  }

  const rewardScale =
    session.plannedCoinAmountSnapshot / session.suggestedRawCoinAmountSnapshot;

  if (!Number.isFinite(rewardScale) || rewardScale <= 0) {
    throw new Error('TaskSession reward scale must be finite and greater than 0.');
  }

  return rewardScale;
}

export function calculateTaskSessionReward(
  session: TaskSession,
  now: Date = new Date()
): TaskSessionReward {
  const activeSeconds = calculateTaskSessionActiveSeconds(session, now);
  const baseRawReward = calculateRawTaskReward(
    activeSeconds,
    session.coinsPerHourSnapshot,
    session.isFocusedSnapshot
  );
  const rewardScale = calculateTaskSessionRewardScale(session);
  const adjustedRawReward = baseRawReward * rewardScale;

  if (!Number.isFinite(adjustedRawReward) || adjustedRawReward < 0) {
    throw new Error('TaskSession adjusted reward must be finite and non-negative.');
  }

  return {
    activeSeconds,
    baseRawReward,
    rewardScale,
    adjustedRawReward,
    coinAmount: Math.ceil(adjustedRawReward),
  };
}

export function calculateTaskSessionGoalProgress(
  session: TaskSession,
  now: Date = new Date()
): TaskSessionGoalProgress {
  const reward = calculateTaskSessionReward(session, now);
  const goalRewardCoinAmount = session.plannedCoinAmountSnapshot;

  return {
    ...reward,
    goalReached: reward.activeSeconds >= session.goalDurationSecondsSnapshot,
    goalRewardCoinAmount,
    extraCoinAmount: Math.max(0, reward.coinAmount - goalRewardCoinAmount),
  };
}

export function getTaskSessionRemainingGoalSeconds(
  session: TaskSession,
  now: Date = new Date()
): number {
  const activeSeconds = calculateTaskSessionActiveSeconds(session, now);

  return Math.max(0, session.goalDurationSecondsSnapshot - activeSeconds);
}

export function shouldScheduleTaskSessionGoalNotification(
  session: TaskSession,
  now: Date = new Date()
): boolean {
  return (
    session.endedAt === null &&
    session.activeStartedAt !== null &&
    session.extendedAt === null &&
    getTaskSessionRemainingGoalSeconds(session, now) > 0
  );
}
