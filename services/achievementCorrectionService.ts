import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from '@/database/database';
import type { Achievement, CoinTransaction, DailyLog } from '@/models/types';
import {
  archiveAchievement,
  getAchievementById,
  updateAchievement,
} from '@/services/achievementService';
import { createTransaction } from '@/services/coinTransactionService';
import { getOrCreateDailyLog } from '@/services/dailyLogService';
import { parseTimestamp } from '@/utils/timestamp';

export type EditRecordedAchievementInput = {
  achievementId: string;
  name: string;
  description?: string;
  coinBonus: number;
  occurredAt?: string;
};

export type EditRecordedAchievementResult = {
  achievement: Achievement;
  dailyLog: DailyLog | null;
  transaction: CoinTransaction | null;
};

export type DeleteRecordedAchievementInput = {
  achievementId: string;
  occurredAt?: string;
};

export type DeleteRecordedAchievementResult = {
  achievement: Achievement;
  dailyLog: DailyLog;
  transaction: CoinTransaction;
};

function validateAchievementId(achievementId: string): string {
  const trimmedAchievementId = achievementId.trim();

  if (trimmedAchievementId.length === 0) {
    throw new Error('Achievement correction achievementId must not be blank.');
  }

  return trimmedAchievementId;
}

function resolveOccurredAt(occurredAt: string | undefined): { timestamp: string; date: Date } {
  const timestamp = occurredAt === undefined ? new Date().toISOString() : occurredAt;

  return parseTimestamp(timestamp, 'Achievement correction occurredAt');
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

async function beginImmediateTransaction(db: SQLiteDatabase): Promise<void> {
  // Serialize the bonus read-modify-write so concurrent corrections cannot apply stale deltas.
  await db.execAsync('BEGIN IMMEDIATE');
}

export async function editRecordedAchievement(
  input: EditRecordedAchievementInput
): Promise<EditRecordedAchievementResult> {
  const achievementId = validateAchievementId(input.achievementId);
  const { timestamp: occurredAt, date: occurredDate } = resolveOccurredAt(input.occurredAt);
  const dailyLogDate = getLocalCalendarDate(occurredDate);
  const db = await initDatabase({ useNewConnection: true });
  let transactionOpen = false;

  try {
    await beginImmediateTransaction(db);
    transactionOpen = true;

    const existingAchievement = await getAchievementById(achievementId, db);

    if (!existingAchievement) {
      throw new Error(`Achievement with id "${achievementId}" does not exist.`);
    }

    if (existingAchievement.archivedAt !== null) {
      throw new Error(`Achievement with id "${achievementId}" is archived and cannot be edited.`);
    }

    const achievement = await updateAchievement(
      achievementId,
      {
        name: input.name,
        description: input.description,
        coinBonus: input.coinBonus,
      },
      db
    );

    if (!achievement) {
      throw new Error(`Achievement with id "${achievementId}" no longer exists.`);
    }

    const delta = achievement.coinBonus - existingAchievement.coinBonus;
    let dailyLog: DailyLog | null = null;
    let transaction: CoinTransaction | null = null;

    if (delta !== 0) {
      dailyLog = await getOrCreateDailyLog(dailyLogDate, db);
      transaction = await createTransaction(
        {
          type: delta > 0 ? 'EARN' : 'SPEND',
          amount: Math.abs(delta),
          actualDurationMinutes: null,
          sourceName: achievement.name,
          taskId: null,
          rewardId: null,
          achievementId: achievement.id,
          dailyLogId: dailyLog.id,
          occurredAt,
        },
        db
      );
    }

    await db.execAsync('COMMIT');
    transactionOpen = false;

    return { achievement, dailyLog, transaction };
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

export async function deleteRecordedAchievement(
  input: DeleteRecordedAchievementInput
): Promise<DeleteRecordedAchievementResult> {
  const achievementId = validateAchievementId(input.achievementId);
  const { timestamp: occurredAt, date: occurredDate } = resolveOccurredAt(input.occurredAt);
  const dailyLogDate = getLocalCalendarDate(occurredDate);
  const db = await initDatabase({ useNewConnection: true });
  let transactionOpen = false;

  try {
    await beginImmediateTransaction(db);
    transactionOpen = true;

    const existingAchievement = await getAchievementById(achievementId, db);

    if (!existingAchievement) {
      throw new Error(`Achievement with id "${achievementId}" does not exist.`);
    }

    if (existingAchievement.archivedAt !== null) {
      throw new Error(`Achievement with id "${achievementId}" is already archived.`);
    }

    const achievement = await archiveAchievement(achievementId, db);

    if (!achievement) {
      throw new Error(`Achievement with id "${achievementId}" no longer exists.`);
    }

    const dailyLog = await getOrCreateDailyLog(dailyLogDate, db);
    const transaction = await createTransaction(
      {
        type: 'SPEND',
        amount: existingAchievement.coinBonus,
        actualDurationMinutes: null,
        sourceName: existingAchievement.name,
        taskId: null,
        rewardId: null,
        achievementId: existingAchievement.id,
        dailyLogId: dailyLog.id,
        occurredAt,
      },
      db
    );

    await db.execAsync('COMMIT');
    transactionOpen = false;

    return { achievement, dailyLog, transaction };
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
