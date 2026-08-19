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
  priority: TaskPriority;
  createdAt: string;
}

export type TransactionType = 'EARN' | 'SPEND';

export interface CoinTransaction {
  id: string;
  type: TransactionType;

  amount: number;
  actualDurationMinutes: number | null;

  // Snapshot of the source name at the time the transaction occurred
  sourceName: string;

  // Exactly one of these will normally be non-null
  taskId: string | null;
  rewardId: string | null;
  achievementId: string | null;

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
