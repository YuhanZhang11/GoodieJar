export interface TaskCategory {
  id: string;
  name: string;
  isSystem: boolean;
  createdAt: string;
  archivedAt: string | null;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  categoryId: string;

  coinsPerHour: number;
  isFocused: boolean;
  estimatedDurationMinutes: number | null;

  createdAt: string;
  archivedAt: string | null;
}

export interface Reward {
  id: string;
  name: string;
  description: string;

  coinCost: number;
  estimatedDurationMinutes: number | null;

  createdAt: string;
  archivedAt: string | null;
}

export interface DailyLog {
  id: string;
  date: string;

  mentalExhaustion: number | null;
}

export type TaskPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';

export interface DailyTaskPlan {
  id: string;
  taskId: string;
  dailyLogId: string;
  categoryId: string;
  plannedDurationMinutes: number;
  plannedCoinAmount: number;
  coinsPerHourSnapshot: number;
  isFocusedSnapshot: boolean;
  suggestedRawCoinAmount: number;
  suggestedCoinAmount: number;
  priority: TaskPriority;
  createdAt: string;
}

export interface TaskSession {
  id: string;
  taskPlanId: string;

  startedAt: string;
  activeStartedAt: string | null;
  accumulatedSeconds: number;
  endedAt: string | null;
  extendedAt: string | null;

  goalDurationSecondsSnapshot: number;
  coinsPerHourSnapshot: number;
  isFocusedSnapshot: boolean;
  suggestedRawCoinAmountSnapshot: number;
  suggestedCoinAmountSnapshot: number;
  plannedCoinAmountSnapshot: number;

  coinTransactionId: string | null;
  goalNotificationId: string | null;
  createdAt: string;
}

export interface DailyGoal {
  id: string;
  dailyLogId: string;
  focusGoalMinutes: number;
  taskGoalCount: number;
  typicalHourlyRateSnapshot: number | null;
  focusBonusAmountSnapshot: number | null;
  taskBonusAmountSnapshot: number | null;
  comboBonusAmountSnapshot: number | null;
  finalFocusSecondsSnapshot: number | null;
  finalCompletedTaskCountSnapshot: number | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'EARN' | 'SPEND';
export type GoalBonusKind = 'FOCUS' | 'TASK' | 'COMBO';

export interface CoinTransaction {
  id: string;
  type: TransactionType;

  amount: number;
  actualDurationMinutes: number | null;

  // Snapshot of the source name at the time the transaction occurred
  sourceName: string;

  // Exactly one main source ID is non-null
  taskId: string | null;
  rewardId: string | null;
  achievementId: string | null;
  dailyGoalId: string | null;
  goalBonusKind: GoalBonusKind | null;

  dailyLogId: string;

  occurredAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;

  coinBonus: number;

  // Achievement already happened when the user adds it
  achievedAt: string;

  // When this record was added to GoodieJar
  createdAt: string;

  archivedAt: string | null;
}
