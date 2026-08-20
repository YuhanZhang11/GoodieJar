import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from '@/database/database';
import type { CoinTransaction, TransactionType } from '@/models/types';
import { getDailyLogByDate } from '@/services/dailyLogService';
import { parseTimestamp } from '@/utils/timestamp';

type CoinTransactionRow = {
  id: string;
  type: TransactionType;
  amount: number;
  actual_duration_minutes: number | null;
  source_name: string;
  task_id: string | null;
  reward_id: string | null;
  achievement_id: string | null;
  daily_log_id: string;
  occurred_at: string;
};

type BalanceRow = {
  balance: number | null;
};

export type CreateTransactionInput = {
  type: TransactionType;
  amount: number;
  actualDurationMinutes?: number | null;
  sourceName: string;
  taskId?: string | null;
  rewardId?: string | null;
  achievementId?: string | null;
  dailyLogId: string;
  occurredAt: string;
};

function mapCoinTransactionRow(row: CoinTransactionRow): CoinTransaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    actualDurationMinutes: row.actual_duration_minutes,
    sourceName: row.source_name,
    taskId: row.task_id,
    rewardId: row.reward_id,
    achievementId: row.achievement_id,
    dailyLogId: row.daily_log_id,
    occurredAt: row.occurred_at,
  };
}

function createId(): string {
  return `coin_transaction_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function validateDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Transaction date must use YYYY-MM-DD format.');
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new Error('Transaction date must be a valid calendar date.');
  }

  return date;
}

function validateType(type: TransactionType): TransactionType {
  if (type !== 'EARN' && type !== 'SPEND') {
    throw new Error("Transaction type must be either 'EARN' or 'SPEND'.");
  }

  return type;
}

function validateAmount(amount: number): number {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Transaction amount must be an integer greater than 0.');
  }

  return amount;
}

function validateActualDuration(actualDurationMinutes: number | null | undefined): number | null {
  if (actualDurationMinutes == null) {
    return null;
  }

  if (!Number.isInteger(actualDurationMinutes) || actualDurationMinutes <= 0) {
    throw new Error('Transaction actualDurationMinutes must be null or an integer greater than 0.');
  }

  return actualDurationMinutes;
}

function validateNonBlank(value: string, fieldName: string): string {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new Error(`Transaction ${fieldName} must not be blank.`);
  }

  return trimmedValue;
}

function normalizeSourceId(sourceId: string | null | undefined, fieldName: string): string | null {
  if (sourceId == null) {
    return null;
  }

  return validateNonBlank(sourceId, fieldName);
}

function validateSources(input: CreateTransactionInput) {
  const sources = {
    taskId: normalizeSourceId(input.taskId, 'taskId'),
    rewardId: normalizeSourceId(input.rewardId, 'rewardId'),
    achievementId: normalizeSourceId(input.achievementId, 'achievementId'),
  };
  const sourceCount = Object.values(sources).filter((sourceId) => sourceId !== null).length;

  if (sourceCount !== 1) {
    throw new Error('Transaction must have exactly one source ID.');
  }

  return sources;
}

async function getDatabase(): Promise<SQLiteDatabase> {
  return initDatabase();
}

export async function createTransaction(
  input: CreateTransactionInput,
  database?: SQLiteDatabase
): Promise<CoinTransaction> {
  const db = database ?? (await getDatabase());
  const sources = validateSources(input);
  const transaction: CoinTransaction = {
    id: createId(),
    type: validateType(input.type),
    amount: validateAmount(input.amount),
    actualDurationMinutes: validateActualDuration(input.actualDurationMinutes),
    sourceName: validateNonBlank(input.sourceName, 'sourceName'),
    taskId: sources.taskId,
    rewardId: sources.rewardId,
    achievementId: sources.achievementId,
    dailyLogId: validateNonBlank(input.dailyLogId, 'dailyLogId'),
    occurredAt: parseTimestamp(input.occurredAt, 'Transaction occurredAt').timestamp,
  };

  await db.runAsync(
    `INSERT INTO coin_transactions (
      id,
      type,
      amount,
      actual_duration_minutes,
      source_name,
      task_id,
      reward_id,
      achievement_id,
      daily_log_id,
      occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.id,
      transaction.type,
      transaction.amount,
      transaction.actualDurationMinutes,
      transaction.sourceName,
      transaction.taskId,
      transaction.rewardId,
      transaction.achievementId,
      transaction.dailyLogId,
      transaction.occurredAt,
    ]
  );

  return transaction;
}

export async function getTransactionById(
  id: string,
  database?: SQLiteDatabase
): Promise<CoinTransaction | null> {
  const db = database ?? (await getDatabase());
  const row = await db.getFirstAsync<CoinTransactionRow>(
    'SELECT * FROM coin_transactions WHERE id = ?',
    [id]
  );

  return row ? mapCoinTransactionRow(row) : null;
}

export async function getTransactionsByDailyLogId(
  dailyLogId: string,
  database?: SQLiteDatabase
): Promise<CoinTransaction[]> {
  const validDailyLogId = validateNonBlank(dailyLogId, 'dailyLogId');
  const db = database ?? (await getDatabase());
  const rows = await db.getAllAsync<CoinTransactionRow>(
    'SELECT * FROM coin_transactions WHERE daily_log_id = ? ORDER BY occurred_at ASC',
    [validDailyLogId]
  );

  return rows.map(mapCoinTransactionRow);
}

export async function getTransactionsByDate(date: string): Promise<CoinTransaction[]> {
  const dailyLog = await getDailyLogByDate(validateDate(date));

  if (!dailyLog) {
    return [];
  }

  return getTransactionsByDailyLogId(dailyLog.id);
}

export async function getCurrentBalance(database?: SQLiteDatabase): Promise<number> {
  const db = database ?? (await getDatabase());
  const row = await db.getFirstAsync<BalanceRow>(
    `SELECT COALESCE(
      SUM(CASE
        WHEN type = 'EARN' THEN amount
        WHEN type = 'SPEND' THEN -amount
        ELSE 0
      END),
      0
    ) AS balance
    FROM coin_transactions`
  );

  return row?.balance ?? 0;
}
