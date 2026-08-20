import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from '@/database/database';
import type { CoinTransaction, TaskSession } from '@/models/types';
import {
  createTransaction,
  getTransactionById,
  getTransactionsByDailyLogId,
} from '@/services/coinTransactionService';
import {
  getTaskPlanById,
  type TaskPlanDetails,
} from '@/services/dailyTaskPlanService';
import {
  calculateTaskSessionActiveSeconds,
  calculateTaskSessionReward,
  getTaskSessionState,
  type TaskSessionReward,
} from '@/utils/taskSession';

type TaskSessionRow = {
  id: string;
  task_plan_id: string;
  started_at: string;
  active_started_at: string | null;
  accumulated_seconds: number;
  ended_at: string | null;
  goal_duration_seconds_snapshot: number;
  coins_per_hour_snapshot: number;
  is_focused_snapshot: number;
  suggested_raw_coin_amount_snapshot: number;
  suggested_coin_amount_snapshot: number;
  planned_coin_amount_snapshot: number;
  coin_transaction_id: string | null;
  created_at: string;
};

export type TaskSessionDetails = {
  session: TaskSession;
  planDetails: TaskPlanDetails;
};

export type StopTaskSessionResult = TaskSessionDetails & {
  transaction: CoinTransaction;
  reward: TaskSessionReward;
};

function mapTaskSessionRow(row: TaskSessionRow): TaskSession {
  return {
    id: row.id,
    taskPlanId: row.task_plan_id,
    startedAt: row.started_at,
    activeStartedAt: row.active_started_at,
    accumulatedSeconds: row.accumulated_seconds,
    endedAt: row.ended_at,
    goalDurationSecondsSnapshot: row.goal_duration_seconds_snapshot,
    coinsPerHourSnapshot: row.coins_per_hour_snapshot,
    isFocusedSnapshot: row.is_focused_snapshot === 1,
    suggestedRawCoinAmountSnapshot: row.suggested_raw_coin_amount_snapshot,
    suggestedCoinAmountSnapshot: row.suggested_coin_amount_snapshot,
    plannedCoinAmountSnapshot: row.planned_coin_amount_snapshot,
    coinTransactionId: row.coin_transaction_id,
    createdAt: row.created_at,
  };
}

function createId(): string {
  return `task_session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function validateId(id: string, fieldName: string): string {
  const trimmedId = id.trim();

  if (trimmedId.length === 0) {
    throw new Error(`${fieldName} must not be blank.`);
  }

  return trimmedId;
}

async function rollbackTransaction(db: SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync('ROLLBACK');
  } catch {
    // Closing the private connection will roll back any transaction still open.
  }
}

async function readTaskSessionById(
  id: string,
  db: SQLiteDatabase
): Promise<TaskSession | null> {
  const row = await db.getFirstAsync<TaskSessionRow>(
    'SELECT * FROM task_sessions WHERE id = ?',
    [id]
  );

  return row ? mapTaskSessionRow(row) : null;
}

async function readOpenTaskSession(db: SQLiteDatabase): Promise<TaskSession | null> {
  const row = await db.getFirstAsync<TaskSessionRow>(
    `SELECT *
     FROM task_sessions
     WHERE ended_at IS NULL
     ORDER BY created_at ASC
     LIMIT 1`
  );

  return row ? mapTaskSessionRow(row) : null;
}

async function loadDetails(
  session: TaskSession,
  db: SQLiteDatabase
): Promise<TaskSessionDetails> {
  const planDetails = await getTaskPlanById(session.taskPlanId, db);

  if (!planDetails) {
    throw new Error(`Task plan with id "${session.taskPlanId}" does not exist.`);
  }

  return { session, planDetails };
}

export async function getTaskSessionById(id: string): Promise<TaskSessionDetails | null> {
  const sessionId = validateId(id, 'TaskSession id');
  const db = await initDatabase({ useNewConnection: true });

  try {
    const session = await readTaskSessionById(sessionId, db);

    return session ? await loadDetails(session, db) : null;
  } finally {
    await db.closeAsync();
  }
}

export async function getOpenTaskSession(): Promise<TaskSessionDetails | null> {
  const db = await initDatabase({ useNewConnection: true });

  try {
    const session = await readOpenTaskSession(db);

    return session ? await loadDetails(session, db) : null;
  } finally {
    await db.closeAsync();
  }
}

export async function startTaskSession(taskPlanId: string): Promise<TaskSessionDetails> {
  const planId = validateId(taskPlanId, 'TaskSession taskPlanId');
  const db = await initDatabase({ useNewConnection: true });
  let transactionOpen = false;

  try {
    await db.execAsync('BEGIN IMMEDIATE');
    transactionOpen = true;

    const planDetails = await getTaskPlanById(planId, db);

    if (!planDetails) {
      throw new Error(`Task plan with id "${planId}" does not exist.`);
    }

    if (planDetails.task.archivedAt !== null) {
      throw new Error(`Task with id "${planDetails.task.id}" is archived and cannot be started.`);
    }

    const completionTransactions = await getTransactionsByDailyLogId(
      planDetails.plan.dailyLogId,
      db
    );
    const alreadyCompleted = completionTransactions.some(
      (transaction) =>
        transaction.type === 'EARN' && transaction.taskId === planDetails.task.id
    );

    if (alreadyCompleted) {
      throw new Error('This Task plan has already been completed.');
    }

    const openSession = await readOpenTaskSession(db);

    if (openSession) {
      if (openSession.taskPlanId === planId) {
        const details = await loadDetails(openSession, db);

        await db.execAsync('COMMIT');
        transactionOpen = false;
        return details;
      }

      throw new Error(
        'Another focus session is already open. Stop it before starting a new one.'
      );
    }

    const now = new Date().toISOString();
    const session: TaskSession = {
      id: createId(),
      taskPlanId: planId,
      startedAt: now,
      activeStartedAt: now,
      accumulatedSeconds: 0,
      endedAt: null,
      goalDurationSecondsSnapshot: planDetails.plan.plannedDurationMinutes * 60,
      coinsPerHourSnapshot: planDetails.plan.coinsPerHourSnapshot,
      isFocusedSnapshot: planDetails.plan.isFocusedSnapshot,
      suggestedRawCoinAmountSnapshot: planDetails.plan.suggestedRawCoinAmount,
      suggestedCoinAmountSnapshot: planDetails.plan.suggestedCoinAmount,
      plannedCoinAmountSnapshot: planDetails.plan.plannedCoinAmount,
      coinTransactionId: null,
      createdAt: now,
    };

    await db.runAsync(
      `INSERT INTO task_sessions (
        id,
        task_plan_id,
        started_at,
        active_started_at,
        accumulated_seconds,
        ended_at,
        goal_duration_seconds_snapshot,
        coins_per_hour_snapshot,
        is_focused_snapshot,
        suggested_raw_coin_amount_snapshot,
        suggested_coin_amount_snapshot,
        planned_coin_amount_snapshot,
        coin_transaction_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.taskPlanId,
        session.startedAt,
        session.activeStartedAt,
        session.accumulatedSeconds,
        session.endedAt,
        session.goalDurationSecondsSnapshot,
        session.coinsPerHourSnapshot,
        session.isFocusedSnapshot ? 1 : 0,
        session.suggestedRawCoinAmountSnapshot,
        session.suggestedCoinAmountSnapshot,
        session.plannedCoinAmountSnapshot,
        session.coinTransactionId,
        session.createdAt,
      ]
    );

    await db.execAsync('COMMIT');
    transactionOpen = false;

    return { session, planDetails };
  } catch (error) {
    if (transactionOpen) {
      await rollbackTransaction(db);
    }

    throw error;
  } finally {
    await db.closeAsync();
  }
}

export async function pauseTaskSession(id: string): Promise<TaskSessionDetails> {
  const sessionId = validateId(id, 'TaskSession id');
  const db = await initDatabase({ useNewConnection: true });
  let transactionOpen = false;

  try {
    await db.execAsync('BEGIN IMMEDIATE');
    transactionOpen = true;

    const existingSession = await readTaskSessionById(sessionId, db);

    if (!existingSession) {
      throw new Error(`TaskSession with id "${sessionId}" does not exist.`);
    }

    if (getTaskSessionState(existingSession) === 'COMPLETED') {
      throw new Error('Completed focus sessions cannot be paused.');
    }

    if (existingSession.activeStartedAt === null) {
      const details = await loadDetails(existingSession, db);

      await db.execAsync('COMMIT');
      transactionOpen = false;
      return details;
    }

    const now = new Date();
    const session: TaskSession = {
      ...existingSession,
      accumulatedSeconds: calculateTaskSessionActiveSeconds(existingSession, now),
      activeStartedAt: null,
    };

    await db.runAsync(
      `UPDATE task_sessions
       SET accumulated_seconds = ?, active_started_at = ?
       WHERE id = ?`,
      [session.accumulatedSeconds, session.activeStartedAt, session.id]
    );

    const details = await loadDetails(session, db);

    await db.execAsync('COMMIT');
    transactionOpen = false;

    return details;
  } catch (error) {
    if (transactionOpen) {
      await rollbackTransaction(db);
    }

    throw error;
  } finally {
    await db.closeAsync();
  }
}

export async function resumeTaskSession(id: string): Promise<TaskSessionDetails> {
  const sessionId = validateId(id, 'TaskSession id');
  const db = await initDatabase({ useNewConnection: true });
  let transactionOpen = false;

  try {
    await db.execAsync('BEGIN IMMEDIATE');
    transactionOpen = true;

    const existingSession = await readTaskSessionById(sessionId, db);

    if (!existingSession) {
      throw new Error(`TaskSession with id "${sessionId}" does not exist.`);
    }

    if (getTaskSessionState(existingSession) === 'COMPLETED') {
      throw new Error('Completed focus sessions cannot be resumed.');
    }

    if (existingSession.activeStartedAt !== null) {
      const details = await loadDetails(existingSession, db);

      await db.execAsync('COMMIT');
      transactionOpen = false;
      return details;
    }

    const activeStartedAt = new Date().toISOString();
    const session: TaskSession = { ...existingSession, activeStartedAt };

    await db.runAsync('UPDATE task_sessions SET active_started_at = ? WHERE id = ?', [
      session.activeStartedAt,
      session.id,
    ]);

    const details = await loadDetails(session, db);

    await db.execAsync('COMMIT');
    transactionOpen = false;

    return details;
  } catch (error) {
    if (transactionOpen) {
      await rollbackTransaction(db);
    }

    throw error;
  } finally {
    await db.closeAsync();
  }
}

export async function stopTaskSession(id: string): Promise<StopTaskSessionResult> {
  const sessionId = validateId(id, 'TaskSession id');
  const db = await initDatabase({ useNewConnection: true });
  let transactionOpen = false;

  try {
    await db.execAsync('BEGIN IMMEDIATE');
    transactionOpen = true;

    const existingSession = await readTaskSessionById(sessionId, db);

    if (!existingSession) {
      throw new Error(`TaskSession with id "${sessionId}" does not exist.`);
    }

    const planDetails = await getTaskPlanById(existingSession.taskPlanId, db);

    if (!planDetails) {
      throw new Error(`Task plan with id "${existingSession.taskPlanId}" does not exist.`);
    }

    if (existingSession.endedAt !== null) {
      if (!existingSession.coinTransactionId) {
        throw new Error('Completed TaskSession is missing its CoinTransaction.');
      }

      const transaction = await getTransactionById(existingSession.coinTransactionId, db);

      if (!transaction) {
        throw new Error('Completed TaskSession CoinTransaction does not exist.');
      }

      const reward = calculateTaskSessionReward(existingSession);

      await db.execAsync('COMMIT');
      transactionOpen = false;

      return { session: existingSession, planDetails, transaction, reward };
    }

    const now = new Date();
    const accumulatedSeconds = calculateTaskSessionActiveSeconds(existingSession, now);

    if (accumulatedSeconds <= 0) {
      throw new Error('A focus session needs positive active time before it can be stopped.');
    }

    const endedAt = now.toISOString();
    const completedSession: TaskSession = {
      ...existingSession,
      activeStartedAt: null,
      accumulatedSeconds,
      endedAt,
    };
    const reward = calculateTaskSessionReward(completedSession, now);

    if (reward.coinAmount < 1) {
      throw new Error('A focus session must earn at least 1 coin before it can be stopped.');
    }

    const transaction = await createTransaction(
      {
        type: 'EARN',
        amount: reward.coinAmount,
        actualDurationMinutes: Math.max(1, Math.ceil(accumulatedSeconds / 60)),
        sourceName: planDetails.task.name,
        taskId: planDetails.task.id,
        rewardId: null,
        achievementId: null,
        dailyLogId: planDetails.plan.dailyLogId,
        occurredAt: endedAt,
      },
      db
    );
    const session: TaskSession = {
      ...completedSession,
      coinTransactionId: transaction.id,
    };

    await db.runAsync(
      `UPDATE task_sessions
       SET active_started_at = ?,
           accumulated_seconds = ?,
           ended_at = ?,
           coin_transaction_id = ?
       WHERE id = ?`,
      [
        session.activeStartedAt,
        session.accumulatedSeconds,
        session.endedAt,
        session.coinTransactionId,
        session.id,
      ]
    );

    await db.execAsync('COMMIT');
    transactionOpen = false;

    return { session, planDetails, transaction, reward };
  } catch (error) {
    if (transactionOpen) {
      await rollbackTransaction(db);
    }

    throw error;
  } finally {
    await db.closeAsync();
  }
}
