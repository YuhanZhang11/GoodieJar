import { initDatabase } from '@/database/database';
import type { CoinTransaction, DailyLog, Task } from '@/models/types';
import { createTransaction } from '@/services/coinTransactionService';
import { getOrCreateDailyLog } from '@/services/dailyLogService';
import { getTaskById } from '@/services/taskService';
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

function getLocalCalendarDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export async function completeTask(input: CompleteTaskInput): Promise<CompleteTaskResult> {
  const taskId = validateTaskId(input.taskId);
  const { timestamp: occurredAt, date: occurredDate } = resolveOccurredAt(input.occurredAt);
  const dailyLogDate = getLocalCalendarDate(occurredDate);
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
          amount: task.coinReward,
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
