import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from '@/database/database';
import type { CoinTransaction, DailyLog, DailyTaskPlan, Task } from '@/models/types';
import {
  createTransaction,
  getTransactionsByDailyLogId,
} from '@/services/coinTransactionService';
import { getTaskPlanById } from '@/services/dailyTaskPlanService';
import { getOrCreateDailyLog } from '@/services/dailyLogService';
import { getTaskById } from '@/services/taskService';
import { getLocalDateKey } from '@/utils/localDate';
import { parseTimestamp } from '@/utils/timestamp';

export type CompleteTaskInput = {
  taskId: string;
  actualDurationMinutes?: number | null;
  occurredAt?: string;
};

export type CompleteTaskResult = {
  task: Task;
  dailyLog: DailyLog;
  transaction: CoinTransaction;
};

export type CompleteTaskPlanInput = {
  planId: string;
  actualDurationMinutes?: number | null;
  occurredAt?: string;
};

export type CompleteTaskPlanResult = CompleteTaskResult & {
  plan: DailyTaskPlan;
};

function validateTaskId(taskId: string): string {
  const trimmedTaskId = taskId.trim();

  if (trimmedTaskId.length === 0) {
    throw new Error('Task completion taskId must not be blank.');
  }

  return trimmedTaskId;
}

function resolveOccurredAt(occurredAt: string | undefined): { timestamp: string; date: Date } {
  const timestamp = occurredAt === undefined ? new Date().toISOString() : occurredAt;

  return parseTimestamp(timestamp, 'Task completion occurredAt');
}

async function rollbackTransaction(db: SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync('ROLLBACK');
  } catch {
    // Closing the private connection will roll back any transaction still open.
  }
}

function validatePlanId(planId: string): string {
  const trimmedPlanId = planId.trim();

  if (trimmedPlanId.length === 0) {
    throw new Error('Task plan completion planId must not be blank.');
  }

  return trimmedPlanId;
}

export async function completeTask(input: CompleteTaskInput): Promise<CompleteTaskResult> {
  const taskId = validateTaskId(input.taskId);
  const { timestamp: occurredAt, date: occurredDate } = resolveOccurredAt(input.occurredAt);
  const dailyLogDate = getLocalDateKey(occurredDate);
  const db = await initDatabase({ useNewConnection: true });
  let result: CompleteTaskResult | undefined;

  try {
    await db.withTransactionAsync(async () => {
      const task = await getTaskById(taskId, db);

      if (!task) {
        throw new Error(`Task with id "${taskId}" does not exist.`);
      }

      if (task.archivedAt !== null) {
        throw new Error(`Task with id "${taskId}" is archived and cannot be completed.`);
      }

      const dailyLog = await getOrCreateDailyLog(dailyLogDate, db);
      const transaction = await createTransaction(
        {
          type: 'EARN',
          amount: task.coinsPerHour,
          actualDurationMinutes: input.actualDurationMinutes,
          sourceName: task.name,
          taskId: task.id,
          rewardId: null,
          achievementId: null,
          dailyLogId: dailyLog.id,
          occurredAt,
        },
        db
      );

      result = { task, dailyLog, transaction };
    });
  } finally {
    await db.closeAsync();
  }

  if (!result) {
    throw new Error('Task completion did not produce a result.');
  }

  return result;
}

export async function completeTaskPlan(
  input: CompleteTaskPlanInput
): Promise<CompleteTaskPlanResult> {
  const planId = validatePlanId(input.planId);
  const { timestamp: occurredAt, date: occurredDate } = resolveOccurredAt(input.occurredAt);
  const dailyLogDate = getLocalDateKey(occurredDate);
  const db = await initDatabase({ useNewConnection: true });
  let transactionOpen = false;
  let result: CompleteTaskPlanResult | undefined;

  try {
    await db.execAsync('BEGIN IMMEDIATE');
    transactionOpen = true;

    const details = await getTaskPlanById(planId, db);

    if (!details) {
      throw new Error(`Task plan with id "${planId}" does not exist.`);
    }

    if (details.task.archivedAt !== null) {
      throw new Error(`Task with id "${details.task.id}" is archived and cannot be completed.`);
    }

    const dailyLog = await getOrCreateDailyLog(dailyLogDate, db);

    if (dailyLog.id !== details.plan.dailyLogId) {
      throw new Error('Task plans can only be completed on their planned local date.');
    }

    const existingTransactions = await getTransactionsByDailyLogId(dailyLog.id, db);
    const alreadyCompleted = existingTransactions.some(
      (transaction) =>
        transaction.type === 'EARN' && transaction.taskId === details.task.id
    );

    if (alreadyCompleted) {
      throw new Error('This Task plan has already been completed.');
    }

    const transaction = await createTransaction(
      {
        type: 'EARN',
        amount: details.plan.plannedCoinAmount,
        actualDurationMinutes: input.actualDurationMinutes,
        sourceName: details.task.name,
        taskId: details.task.id,
        rewardId: null,
        achievementId: null,
        dailyLogId: dailyLog.id,
        occurredAt,
      },
      db
    );

    result = {
      plan: details.plan,
      task: details.task,
      dailyLog,
      transaction,
    };

    await db.execAsync('COMMIT');
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) {
      await rollbackTransaction(db);
      transactionOpen = false;
    }

    throw error;
  } finally {
    await db.closeAsync();
  }

  if (!result) {
    throw new Error('Task plan completion did not produce a result.');
  }

  return result;
}
