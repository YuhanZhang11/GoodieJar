import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from '@/database/database';
import type { Reward } from '@/models/types';

type RewardRow = {
  id: string;
  name: string;
  description: string;
  coin_cost: number;
  estimated_duration_minutes: number | null;
  created_at: string;
  archived_at: string | null;
};

export type CreateRewardInput = {
  name: string;
  description?: string;
  coinCost: number;
  estimatedDurationMinutes?: number | null;
};

export type UpdateRewardInput = {
  name?: string;
  description?: string;
  coinCost?: number;
  estimatedDurationMinutes?: number | null;
};

function mapRewardRow(row: RewardRow): Reward {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    coinCost: row.coin_cost,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

function createId(): string {
  return `reward_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function validateName(name: string): string {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    throw new Error('Reward name must not be blank.');
  }

  return trimmedName;
}

function validateCoinCost(coinCost: number): number {
  if (!Number.isInteger(coinCost) || coinCost <= 0) {
    throw new Error('Reward coinCost must be an integer greater than 0.');
  }

  return coinCost;
}

function validateEstimatedDuration(estimatedDurationMinutes: number | null | undefined) {
  if (estimatedDurationMinutes == null) {
    return null;
  }

  if (!Number.isInteger(estimatedDurationMinutes) || estimatedDurationMinutes <= 0) {
    throw new Error('Reward estimatedDurationMinutes must be null or an integer greater than 0.');
  }

  return estimatedDurationMinutes;
}

async function getDatabase(): Promise<SQLiteDatabase> {
  return initDatabase();
}

export async function createReward(input: CreateRewardInput): Promise<Reward> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const reward: Reward = {
    id: createId(),
    name: validateName(input.name),
    description: input.description ?? '',
    coinCost: validateCoinCost(input.coinCost),
    estimatedDurationMinutes: validateEstimatedDuration(input.estimatedDurationMinutes),
    createdAt: now,
    archivedAt: null,
  };

  await db.runAsync(
    `INSERT INTO rewards (
      id,
      name,
      description,
      coin_cost,
      estimated_duration_minutes,
      created_at,
      archived_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      reward.id,
      reward.name,
      reward.description,
      reward.coinCost,
      reward.estimatedDurationMinutes,
      reward.createdAt,
      reward.archivedAt,
    ]
  );

  return reward;
}

export async function getRewardById(
  id: string,
  database?: SQLiteDatabase
): Promise<Reward | null> {
  const db = database ?? (await getDatabase());
  const row = await db.getFirstAsync<RewardRow>('SELECT * FROM rewards WHERE id = ?', [id]);

  return row ? mapRewardRow(row) : null;
}

export async function getActiveRewards(): Promise<Reward[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RewardRow>(
    'SELECT * FROM rewards WHERE archived_at IS NULL ORDER BY created_at DESC'
  );

  return rows.map(mapRewardRow);
}

export async function updateReward(id: string, input: UpdateRewardInput): Promise<Reward | null> {
  const existingReward = await getRewardById(id);

  if (!existingReward) {
    return null;
  }

  const updatedReward: Reward = {
    ...existingReward,
    name: input.name === undefined ? existingReward.name : validateName(input.name),
    description: input.description === undefined ? existingReward.description : input.description,
    coinCost:
      input.coinCost === undefined ? existingReward.coinCost : validateCoinCost(input.coinCost),
    estimatedDurationMinutes:
      input.estimatedDurationMinutes === undefined
        ? existingReward.estimatedDurationMinutes
        : validateEstimatedDuration(input.estimatedDurationMinutes),
  };

  const db = await getDatabase();

  await db.runAsync(
    `UPDATE rewards
     SET name = ?,
         description = ?,
         coin_cost = ?,
         estimated_duration_minutes = ?
     WHERE id = ?`,
    [
      updatedReward.name,
      updatedReward.description,
      updatedReward.coinCost,
      updatedReward.estimatedDurationMinutes,
      updatedReward.id,
    ]
  );

  return updatedReward;
}

export async function archiveReward(id: string): Promise<Reward | null> {
  const existingReward = await getRewardById(id);

  if (!existingReward) {
    return null;
  }

  const archivedAt = new Date().toISOString();
  const db = await getDatabase();

  await db.runAsync('UPDATE rewards SET archived_at = ? WHERE id = ?', [archivedAt, id]);

  return {
    ...existingReward,
    archivedAt,
  };
}
