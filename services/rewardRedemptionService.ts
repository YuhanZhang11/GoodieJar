import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from '@/database/database';
import type { CoinTransaction, DailyLog, Reward } from '@/models/types';
import {
  createTransaction,
  getCurrentBalance,
} from '@/services/coinTransactionService';
import { getOrCreateDailyLog } from '@/services/dailyLogService';
import { getRewardById } from '@/services/rewardService';

export type RedeemRewardInput = {
  rewardId: string;
  actualDurationMinutes?: number | null;
  occurredAt?: string;
};

export type RedeemRewardResult = {
  reward: Reward;
  dailyLog: DailyLog;
  transaction: CoinTransaction;
};

function validateRewardId(rewardId: string): string {
  const trimmedRewardId = rewardId.trim();

  if (trimmedRewardId.length === 0) {
    throw new Error('Reward redemption rewardId must not be blank.');
  }

  return trimmedRewardId;
}

function resolveOccurredAt(occurredAt: string | undefined): { timestamp: string; date: Date } {
  const timestamp = occurredAt === undefined ? new Date().toISOString() : occurredAt.trim();
  const date = new Date(timestamp);

  if (timestamp.length === 0 || Number.isNaN(date.getTime())) {
    throw new Error('Reward redemption occurredAt must be a valid timestamp string.');
  }

  return { timestamp, date };
}

function getLocalCalendarDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function rollbackTransaction(db: SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync('ROLLBACK');
  } catch {
    // Closing the private connection will roll back any transaction still open.
  }
}

export async function redeemReward(input: RedeemRewardInput): Promise<RedeemRewardResult> {
  const rewardId = validateRewardId(input.rewardId);
  const { timestamp: occurredAt, date: occurredDate } = resolveOccurredAt(input.occurredAt);
  const dailyLogDate = getLocalCalendarDate(occurredDate);
  const db = await initDatabase({ useNewConnection: true });
  let transactionOpen = false;

  try {
    await db.execAsync('BEGIN IMMEDIATE');
    transactionOpen = true;

    const reward = await getRewardById(rewardId, db);

    if (!reward) {
      throw new Error(`Reward with id "${rewardId}" does not exist.`);
    }

    if (reward.archivedAt !== null) {
      throw new Error(`Reward with id "${rewardId}" is archived and cannot be redeemed.`);
    }

    const currentBalance = await getCurrentBalance(db);

    if (currentBalance < reward.coinCost) {
      throw new Error(
        `Insufficient coin balance to redeem Reward with id "${rewardId}": ` +
          `requires ${reward.coinCost}, available ${currentBalance}.`
      );
    }

    const dailyLog = await getOrCreateDailyLog(dailyLogDate, db);
    const transaction = await createTransaction(
      {
        type: 'SPEND',
        amount: reward.coinCost,
        actualDurationMinutes: input.actualDurationMinutes,
        sourceName: reward.name,
        taskId: null,
        rewardId: reward.id,
        achievementId: null,
        dailyLogId: dailyLog.id,
        occurredAt,
      },
      db
    );

    await db.execAsync('COMMIT');
    transactionOpen = false;

    return { reward, dailyLog, transaction };
  } catch (error) {
    if (transactionOpen) {
      await rollbackTransaction(db);
      transactionOpen = false;
    }

    throw error;
  } finally {
    await db.closeAsync();
  }
}
