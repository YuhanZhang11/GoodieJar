import { initDatabase } from '@/database/database';
import type { Achievement, CoinTransaction, DailyLog } from '@/models/types';
import { createAchievement } from '@/services/achievementService';
import { createTransaction } from '@/services/coinTransactionService';
import { getOrCreateDailyLog } from '@/services/dailyLogService';
import { parseTimestamp } from '@/utils/timestamp';

export type RecordAchievementInput = {
  name: string;
  description?: string;
  coinBonus: number;
  achievedAt?: string;
};

export type RecordAchievementResult = {
  achievement: Achievement;
  dailyLog: DailyLog;
  transaction: CoinTransaction;
};

function resolveAchievedAt(achievedAt: string | undefined): { timestamp: string; date: Date } {
  const timestamp = achievedAt === undefined ? new Date().toISOString() : achievedAt;

  return parseTimestamp(timestamp, 'Achievement recording achievedAt');
}

function getLocalCalendarDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export async function recordAchievement(
  input: RecordAchievementInput
): Promise<RecordAchievementResult> {
  const { timestamp: achievedAt, date: achievedDate } = resolveAchievedAt(input.achievedAt);
  const dailyLogDate = getLocalCalendarDate(achievedDate);
  const db = await initDatabase({ useNewConnection: true });
  let result: RecordAchievementResult | undefined;

  try {
    await db.withTransactionAsync(async () => {
      const achievement = await createAchievement(
        {
          name: input.name,
          description: input.description,
          coinBonus: input.coinBonus,
          achievedAt,
        },
        db
      );
      const dailyLog = await getOrCreateDailyLog(dailyLogDate, db);
      const transaction = await createTransaction(
        {
          type: 'EARN',
          amount: achievement.coinBonus,
          actualDurationMinutes: null,
          sourceName: achievement.name,
          taskId: null,
          rewardId: null,
          achievementId: achievement.id,
          dailyLogId: dailyLog.id,
          occurredAt: achievement.achievedAt,
        },
        db
      );

      result = { achievement, dailyLog, transaction };
    });
  } finally {
    await db.closeAsync();
  }

  if (!result) {
    throw new Error('Achievement recording did not produce a result.');
  }

  return result;
}
