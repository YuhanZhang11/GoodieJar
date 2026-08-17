import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from '@/database/database';
import type { Achievement } from '@/models/types';

type AchievementRow = {
  id: string;
  name: string;
  description: string;
  coin_bonus: number;
  achieved_at: string;
  created_at: string;
  archived_at: string | null;
};

export type CreateAchievementInput = {
  name: string;
  description?: string;
  coinBonus: number;
  achievedAt: string;
};

export type UpdateAchievementInput = {
  name?: string;
  description?: string;
  coinBonus?: number;
  achievedAt?: string;
};

function mapAchievementRow(row: AchievementRow): Achievement {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    coinBonus: row.coin_bonus,
    achievedAt: row.achieved_at,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

function createId(): string {
  return `achievement_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function validateName(name: string): string {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    throw new Error('Achievement name must not be blank.');
  }

  return trimmedName;
}

function validateCoinBonus(coinBonus: number): number {
  if (!Number.isInteger(coinBonus) || coinBonus <= 0) {
    throw new Error('Achievement coinBonus must be an integer greater than 0.');
  }

  return coinBonus;
}

function validateTimestamp(timestamp: string, fieldName: string): string {
  const trimmedTimestamp = timestamp.trim();

  if (trimmedTimestamp.length === 0) {
    throw new Error(`Achievement ${fieldName} must not be blank.`);
  }

  if (Number.isNaN(new Date(trimmedTimestamp).getTime())) {
    throw new Error(`Achievement ${fieldName} must be a valid timestamp string.`);
  }

  return trimmedTimestamp;
}

async function getDatabase(): Promise<SQLiteDatabase> {
  return initDatabase();
}

export async function createAchievement(input: CreateAchievementInput): Promise<Achievement> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const achievement: Achievement = {
    id: createId(),
    name: validateName(input.name),
    description: input.description ?? '',
    coinBonus: validateCoinBonus(input.coinBonus),
    achievedAt: validateTimestamp(input.achievedAt, 'achievedAt'),
    createdAt: now,
    archivedAt: null,
  };

  await db.runAsync(
    `INSERT INTO achievements (
      id,
      name,
      description,
      coin_bonus,
      achieved_at,
      created_at,
      archived_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      achievement.id,
      achievement.name,
      achievement.description,
      achievement.coinBonus,
      achievement.achievedAt,
      achievement.createdAt,
      achievement.archivedAt,
    ]
  );

  return achievement;
}

export async function getAchievementById(id: string): Promise<Achievement | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<AchievementRow>('SELECT * FROM achievements WHERE id = ?', [
    id,
  ]);

  return row ? mapAchievementRow(row) : null;
}

export async function getActiveAchievements(): Promise<Achievement[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AchievementRow>(
    'SELECT * FROM achievements WHERE archived_at IS NULL ORDER BY achieved_at DESC'
  );

  return rows.map(mapAchievementRow);
}

export async function updateAchievement(
  id: string,
  input: UpdateAchievementInput
): Promise<Achievement | null> {
  const existingAchievement = await getAchievementById(id);

  if (!existingAchievement) {
    return null;
  }

  const updatedAchievement: Achievement = {
    ...existingAchievement,
    name: input.name === undefined ? existingAchievement.name : validateName(input.name),
    description:
      input.description === undefined ? existingAchievement.description : input.description,
    coinBonus:
      input.coinBonus === undefined
        ? existingAchievement.coinBonus
        : validateCoinBonus(input.coinBonus),
    achievedAt:
      input.achievedAt === undefined
        ? existingAchievement.achievedAt
        : validateTimestamp(input.achievedAt, 'achievedAt'),
  };

  const db = await getDatabase();

  await db.runAsync(
    `UPDATE achievements
     SET name = ?,
         description = ?,
         coin_bonus = ?,
         achieved_at = ?
     WHERE id = ?`,
    [
      updatedAchievement.name,
      updatedAchievement.description,
      updatedAchievement.coinBonus,
      updatedAchievement.achievedAt,
      updatedAchievement.id,
    ]
  );

  return updatedAchievement;
}

export async function archiveAchievement(id: string): Promise<Achievement | null> {
  const existingAchievement = await getAchievementById(id);

  if (!existingAchievement) {
    return null;
  }

  const archivedAt = new Date().toISOString();
  const db = await getDatabase();

  await db.runAsync('UPDATE achievements SET archived_at = ? WHERE id = ?', [archivedAt, id]);

  return {
    ...existingAchievement,
    archivedAt,
  };
}
