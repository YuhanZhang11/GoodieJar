import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from '@/database/database';
import type { CoinTransaction, DailyGoal, GoalBonusKind } from '@/models/types';
import { createTransaction } from '@/services/coinTransactionService';
import { getOrCreateDailyLog } from '@/services/dailyLogService';
import {
  calculateDailyGoalBonuses,
  calculateMedianRate,
  calculateWeightedMedianRate,
  type DailyGoalBonusSnapshot,
} from '@/utils/dailyGoal';
import { getLocalDateKey, validateLocalDateKey } from '@/utils/localDate';
import { parseTimestamp } from '@/utils/timestamp';

type DailyGoalRow = {
  id: string;
  daily_log_id: string;
  focus_goal_minutes: number;
  task_goal_count: number;
  typical_hourly_rate_snapshot: number | null;
  focus_bonus_amount_snapshot: number | null;
  task_bonus_amount_snapshot: number | null;
  combo_bonus_amount_snapshot: number | null;
  final_focus_seconds_snapshot: number | null;
  final_completed_task_count_snapshot: number | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

type SessionProgressRow = {
  active_started_at: string | null;
  accumulated_seconds: number;
  ended_at: string | null;
  goal_duration_seconds_snapshot: number;
};

type RateObservationRow = { rate: number; weight: number };
type RateRow = { rate: number };
type OpenSessionRow = { open_session: number };
type PayoutRow = { goal_bonus_kind: GoalBonusKind };

export type DailyGoalInput = {
  date: string;
  focusGoalMinutes: number;
  taskGoalCount: number;
};

export type DailyGoalProgress = {
  date: string;
  goal: DailyGoal | null;
  typicalHourlyRate: number | null;
  bonusPreview: DailyGoalBonusSnapshot | null;
  calculatedAt: string;
  totalActiveSeconds: number;
  completedTaskCount: number;
  focusReached: boolean;
  taskReached: boolean;
  comboReached: boolean;
};

export type FinishDailyGoalResult = {
  progress: DailyGoalProgress;
  createdTransactions: CoinTransaction[];
};

const PAYOUT_PRESENTATION: Record<
  GoalBonusKind,
  { sourceName: string; amountField: keyof DailyGoalBonusSnapshot }
> = {
  FOCUS: { sourceName: 'Focus Goal Bonus', amountField: 'focusBonusAmount' },
  TASK: { sourceName: 'Task Goal Bonus', amountField: 'taskBonusAmount' },
  COMBO: { sourceName: 'Daily Goals Combo Bonus', amountField: 'comboBonusAmount' },
};

function mapDailyGoalRow(row: DailyGoalRow): DailyGoal {
  return {
    id: row.id,
    dailyLogId: row.daily_log_id,
    focusGoalMinutes: row.focus_goal_minutes,
    taskGoalCount: row.task_goal_count,
    typicalHourlyRateSnapshot: row.typical_hourly_rate_snapshot,
    focusBonusAmountSnapshot: row.focus_bonus_amount_snapshot,
    taskBonusAmountSnapshot: row.task_bonus_amount_snapshot,
    comboBonusAmountSnapshot: row.combo_bonus_amount_snapshot,
    finalFocusSecondsSnapshot: row.final_focus_seconds_snapshot,
    finalCompletedTaskCountSnapshot: row.final_completed_task_count_snapshot,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createId(): string {
  return `daily_goal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function validateFocusGoalMinutes(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 1439) {
    throw new Error('Focus Time Goal must be an integer from 1 through 1439 minutes.');
  }

  return value;
}

function validateTaskGoalCount(value: number): number {
  if (!Number.isInteger(value) || value < 3) {
    throw new Error('Completed Tasks Goal must be an integer of at least 3.');
  }

  return value;
}

function getHistoricalStartDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const start = new Date(year, month - 1, day, 12, 0, 0, 0);
  start.setDate(start.getDate() - 14);
  return getLocalDateKey(start);
}

function requireFinishedValue(value: number | null, fieldName: string): number {
  if (value === null) {
    throw new Error(`Finished Daily Goal is missing ${fieldName}.`);
  }

  return value;
}

async function rollbackTransaction(db: SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync('ROLLBACK');
  } catch {
    // Closing the private connection will roll back any transaction still open.
  }
}

async function readDailyGoalByDate(
  date: string,
  db: SQLiteDatabase
): Promise<DailyGoal | null> {
  const row = await db.getFirstAsync<DailyGoalRow>(
    `SELECT goal.*
     FROM daily_goals AS goal
     INNER JOIN daily_logs AS daily_log ON daily_log.id = goal.daily_log_id
     WHERE daily_log.date = ?`,
    [date]
  );

  return row ? mapDailyGoalRow(row) : null;
}

async function readTypicalHourlyRate(date: string, db: SQLiteDatabase): Promise<number | null> {
  const historyStart = getHistoricalStartDate(date);
  const observations = await db.getAllAsync<RateObservationRow>(
    `SELECT
       session.coins_per_hour_snapshot AS rate,
       SUM(session.accumulated_seconds) AS weight
     FROM task_sessions AS session
     INNER JOIN daily_task_plans AS plan ON plan.id = session.task_plan_id
     INNER JOIN daily_logs AS daily_log ON daily_log.id = plan.daily_log_id
     WHERE session.ended_at IS NOT NULL
       AND session.accumulated_seconds > 0
       AND daily_log.date >= ?
       AND daily_log.date < ?
     GROUP BY session.coins_per_hour_snapshot
     ORDER BY session.coins_per_hour_snapshot ASC`,
    [historyStart, date]
  );
  const weightedMedian = calculateWeightedMedianRate(observations);

  if (weightedMedian !== null) return weightedMedian;

  const activeTaskRates = await db.getAllAsync<RateRow>(
    `SELECT coins_per_hour AS rate
     FROM tasks
     WHERE archived_at IS NULL
     ORDER BY coins_per_hour ASC, id ASC`
  );

  return calculateMedianRate(activeTaskRates.map((row) => row.rate));
}

async function readSessionProgress(
  dailyLogId: string,
  now: Date,
  db: SQLiteDatabase
): Promise<{ totalActiveSeconds: number; completedTaskCount: number }> {
  const rows = await db.getAllAsync<SessionProgressRow>(
    `SELECT
       session.active_started_at,
       session.accumulated_seconds,
       session.ended_at,
       session.goal_duration_seconds_snapshot
     FROM task_sessions AS session
     INNER JOIN daily_task_plans AS plan ON plan.id = session.task_plan_id
     WHERE plan.daily_log_id = ?`,
    [dailyLogId]
  );
  let totalActiveSeconds = 0;
  let completedTaskCount = 0;

  for (const row of rows) {
    let activeSeconds = row.accumulated_seconds;

    if (row.ended_at === null && row.active_started_at !== null) {
      const activeStartedAt = parseTimestamp(
        row.active_started_at,
        'TaskSession activeStartedAt'
      ).date;
      activeSeconds += Math.max(0, (now.getTime() - activeStartedAt.getTime()) / 1000);
    }

    totalActiveSeconds += activeSeconds;

    if (
      row.ended_at !== null &&
      row.accumulated_seconds >= row.goal_duration_seconds_snapshot
    ) {
      completedTaskCount += 1;
    }
  }

  return { totalActiveSeconds, completedTaskCount };
}

async function hasOpenTaskSession(dailyLogId: string, db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<OpenSessionRow>(
    `SELECT EXISTS(
       SELECT 1
       FROM task_sessions AS session
       INNER JOIN daily_task_plans AS plan ON plan.id = session.task_plan_id
       WHERE plan.daily_log_id = ? AND session.ended_at IS NULL
     ) AS open_session`,
    [dailyLogId]
  );

  return row?.open_session === 1;
}

function buildReachedState(
  goal: DailyGoal | null,
  totalActiveSeconds: number,
  completedTaskCount: number
) {
  const focusReached = goal
    ? totalActiveSeconds >= goal.focusGoalMinutes * 60
    : false;
  const taskReached = goal ? completedTaskCount >= goal.taskGoalCount : false;

  return {
    focusReached,
    taskReached,
    comboReached: focusReached && taskReached,
  };
}

async function buildProgress(
  date: string,
  goal: DailyGoal | null,
  now: Date,
  db: SQLiteDatabase
): Promise<DailyGoalProgress> {
  if (goal?.finishedAt) {
    const totalActiveSeconds = requireFinishedValue(
      goal.finalFocusSecondsSnapshot,
      'final Focus Time snapshot'
    );
    const completedTaskCount = requireFinishedValue(
      goal.finalCompletedTaskCountSnapshot,
      'final completed Tasks snapshot'
    );
    const typicalHourlyRate = requireFinishedValue(
      goal.typicalHourlyRateSnapshot,
      'typical hourly rate snapshot'
    );
    const bonusPreview = {
      focusBonusAmount: requireFinishedValue(
        goal.focusBonusAmountSnapshot,
        'Focus bonus snapshot'
      ),
      taskBonusAmount: requireFinishedValue(goal.taskBonusAmountSnapshot, 'Task bonus snapshot'),
      comboBonusAmount: requireFinishedValue(
        goal.comboBonusAmountSnapshot,
        'combo bonus snapshot'
      ),
    };

    return {
      date,
      goal,
      typicalHourlyRate,
      bonusPreview,
      calculatedAt: now.toISOString(),
      totalActiveSeconds,
      completedTaskCount,
      ...buildReachedState(goal, totalActiveSeconds, completedTaskCount),
    };
  }

  const dailyLog = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM daily_logs WHERE date = ?',
    [date]
  );
  const sessionProgress = dailyLog
    ? await readSessionProgress(dailyLog.id, now, db)
    : { totalActiveSeconds: 0, completedTaskCount: 0 };
  const typicalHourlyRate = await readTypicalHourlyRate(date, db);
  const bonusPreview =
    goal && typicalHourlyRate !== null
      ? calculateDailyGoalBonuses(
          typicalHourlyRate,
          goal.focusGoalMinutes,
          goal.taskGoalCount
        )
      : null;

  return {
    date,
    goal,
    typicalHourlyRate,
    bonusPreview,
    calculatedAt: now.toISOString(),
    ...sessionProgress,
    ...buildReachedState(
      goal,
      sessionProgress.totalActiveSeconds,
      sessionProgress.completedTaskCount
    ),
  };
}

export async function getTypicalHourlyRate(date: string): Promise<number | null> {
  const validDate = validateLocalDateKey(date, 'Daily Goal date');
  const db = await initDatabase({ useNewConnection: true });

  try {
    return await readTypicalHourlyRate(validDate, db);
  } finally {
    await db.closeAsync();
  }
}

export async function getDailyGoalByDate(date: string): Promise<DailyGoal | null> {
  const validDate = validateLocalDateKey(date, 'Daily Goal date');
  const db = await initDatabase({ useNewConnection: true });

  try {
    return await readDailyGoalByDate(validDate, db);
  } finally {
    await db.closeAsync();
  }
}

export async function createDailyGoal(input: DailyGoalInput): Promise<DailyGoal> {
  const date = validateLocalDateKey(input.date, 'Daily Goal date');
  const focusGoalMinutes = validateFocusGoalMinutes(input.focusGoalMinutes);
  const taskGoalCount = validateTaskGoalCount(input.taskGoalCount);
  const db = await initDatabase({ useNewConnection: true });
  let transactionOpen = false;

  try {
    await db.execAsync('BEGIN IMMEDIATE');
    transactionOpen = true;
    const dailyLog = await getOrCreateDailyLog(date, db);

    if (await readDailyGoalByDate(date, db)) {
      throw new Error('Daily Goals have already been set for this date.');
    }

    if ((await readTypicalHourlyRate(date, db)) === null) {
      throw new Error('Create a Task before setting Daily Goals.');
    }

    const now = new Date().toISOString();
    const goal: DailyGoal = {
      id: createId(),
      dailyLogId: dailyLog.id,
      focusGoalMinutes,
      taskGoalCount,
      typicalHourlyRateSnapshot: null,
      focusBonusAmountSnapshot: null,
      taskBonusAmountSnapshot: null,
      comboBonusAmountSnapshot: null,
      finalFocusSecondsSnapshot: null,
      finalCompletedTaskCountSnapshot: null,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.runAsync(
      `INSERT INTO daily_goals (
        id, daily_log_id, focus_goal_minutes, task_goal_count,
        typical_hourly_rate_snapshot, focus_bonus_amount_snapshot,
        task_bonus_amount_snapshot, combo_bonus_amount_snapshot,
        final_focus_seconds_snapshot, final_completed_task_count_snapshot,
        finished_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        goal.id,
        goal.dailyLogId,
        goal.focusGoalMinutes,
        goal.taskGoalCount,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        goal.createdAt,
        goal.updatedAt,
      ]
    );

    await db.execAsync('COMMIT');
    transactionOpen = false;
    return goal;
  } catch (error) {
    if (transactionOpen) await rollbackTransaction(db);
    throw error;
  } finally {
    await db.closeAsync();
  }
}

export async function updateDailyGoal(input: DailyGoalInput): Promise<DailyGoal> {
  const date = validateLocalDateKey(input.date, 'Daily Goal date');
  const focusGoalMinutes = validateFocusGoalMinutes(input.focusGoalMinutes);
  const taskGoalCount = validateTaskGoalCount(input.taskGoalCount);
  const db = await initDatabase({ useNewConnection: true });
  let transactionOpen = false;

  try {
    await db.execAsync('BEGIN IMMEDIATE');
    transactionOpen = true;
    const existingGoal = await readDailyGoalByDate(date, db);

    if (!existingGoal) {
      throw new Error('Daily Goals do not exist for this date.');
    }

    if (existingGoal.finishedAt !== null) {
      throw new Error('Finished Daily Goals cannot be edited.');
    }

    if ((await readTypicalHourlyRate(date, db)) === null) {
      throw new Error('Create an active Task before editing Daily Goals.');
    }

    const updatedAt = new Date().toISOString();
    const goal: DailyGoal = {
      ...existingGoal,
      focusGoalMinutes,
      taskGoalCount,
      updatedAt,
    };

    await db.runAsync(
      `UPDATE daily_goals
       SET focus_goal_minutes = ?, task_goal_count = ?, updated_at = ?
       WHERE id = ? AND finished_at IS NULL`,
      [goal.focusGoalMinutes, goal.taskGoalCount, goal.updatedAt, goal.id]
    );

    await db.execAsync('COMMIT');
    transactionOpen = false;
    return goal;
  } catch (error) {
    if (transactionOpen) await rollbackTransaction(db);
    throw error;
  } finally {
    await db.closeAsync();
  }
}

export async function getDailyGoalProgress(date: string): Promise<DailyGoalProgress> {
  const validDate = validateLocalDateKey(date, 'Daily Goal date');
  const db = await initDatabase({ useNewConnection: true });

  try {
    const goal = await readDailyGoalByDate(validDate, db);
    return await buildProgress(validDate, goal, new Date(), db);
  } finally {
    await db.closeAsync();
  }
}

export async function finishDailyGoal(date: string): Promise<FinishDailyGoalResult> {
  const validDate = validateLocalDateKey(date, 'Daily Goal date');
  const db = await initDatabase({ useNewConnection: true });
  let transactionOpen = false;

  try {
    await db.execAsync('BEGIN IMMEDIATE');
    transactionOpen = true;
    let goal = await readDailyGoalByDate(validDate, db);

    if (!goal) {
      throw new Error('Daily Goals do not exist for this date.');
    }

    if (goal.finishedAt !== null) {
      const progress = await buildProgress(validDate, goal, new Date(), db);
      await db.execAsync('COMMIT');
      transactionOpen = false;
      return { progress, createdTransactions: [] };
    }

    if (await hasOpenTaskSession(goal.dailyLogId, db)) {
      throw new Error('Stop your current focus session before finishing today.');
    }

    const now = new Date();
    const typicalHourlyRate = await readTypicalHourlyRate(validDate, db);

    if (typicalHourlyRate === null) {
      throw new Error('A typical Task rate is required to finish Daily Goals.');
    }

    const bonuses = calculateDailyGoalBonuses(
      typicalHourlyRate,
      goal.focusGoalMinutes,
      goal.taskGoalCount
    );
    const finalProgress = await readSessionProgress(goal.dailyLogId, now, db);
    const reached = buildReachedState(
      goal,
      finalProgress.totalActiveSeconds,
      finalProgress.completedTaskCount
    );
    const finishedAt = now.toISOString();

    await db.runAsync(
      `UPDATE daily_goals
       SET typical_hourly_rate_snapshot = ?,
           focus_bonus_amount_snapshot = ?,
           task_bonus_amount_snapshot = ?,
           combo_bonus_amount_snapshot = ?,
           final_focus_seconds_snapshot = ?,
           final_completed_task_count_snapshot = ?,
           finished_at = ?,
           updated_at = ?
       WHERE id = ? AND finished_at IS NULL`,
      [
        typicalHourlyRate,
        bonuses.focusBonusAmount,
        bonuses.taskBonusAmount,
        bonuses.comboBonusAmount,
        finalProgress.totalActiveSeconds,
        finalProgress.completedTaskCount,
        finishedAt,
        finishedAt,
        goal.id,
      ]
    );

    goal = {
      ...goal,
      typicalHourlyRateSnapshot: typicalHourlyRate,
      focusBonusAmountSnapshot: bonuses.focusBonusAmount,
      taskBonusAmountSnapshot: bonuses.taskBonusAmount,
      comboBonusAmountSnapshot: bonuses.comboBonusAmount,
      finalFocusSecondsSnapshot: finalProgress.totalActiveSeconds,
      finalCompletedTaskCountSnapshot: finalProgress.completedTaskCount,
      finishedAt,
      updatedAt: finishedAt,
    };

    const reachedKinds: GoalBonusKind[] = [];
    if (reached.focusReached) reachedKinds.push('FOCUS');
    if (reached.taskReached) reachedKinds.push('TASK');
    if (reached.comboReached) reachedKinds.push('COMBO');
    const existingPayoutRows = await db.getAllAsync<PayoutRow>(
      `SELECT goal_bonus_kind
       FROM coin_transactions
       WHERE daily_goal_id = ? AND goal_bonus_kind IS NOT NULL`,
      [goal.id]
    );
    const existingPayoutKinds = new Set(
      existingPayoutRows.map((row) => row.goal_bonus_kind)
    );
    const createdTransactions: CoinTransaction[] = [];

    for (const kind of reachedKinds) {
      if (existingPayoutKinds.has(kind)) continue;

      const presentation = PAYOUT_PRESENTATION[kind];
      const amount = bonuses[presentation.amountField];

      if (amount === 0) continue;

      createdTransactions.push(
        await createTransaction(
          {
            type: 'EARN',
            amount,
            actualDurationMinutes: null,
            sourceName: presentation.sourceName,
            taskId: null,
            rewardId: null,
            achievementId: null,
            dailyGoalId: goal.id,
            goalBonusKind: kind,
            dailyLogId: goal.dailyLogId,
            occurredAt: finishedAt,
          },
          db
        )
      );
    }

    const progress = await buildProgress(validDate, goal, now, db);
    await db.execAsync('COMMIT');
    transactionOpen = false;
    return { progress, createdTransactions };
  } catch (error) {
    if (transactionOpen) await rollbackTransaction(db);
    throw error;
  } finally {
    await db.closeAsync();
  }
}
