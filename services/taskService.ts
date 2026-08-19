import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from '@/database/database';
import { OTHER_TASK_CATEGORY_ID } from '@/database/defaultTaskCategories';
import type { Task } from '@/models/types';
import { getTaskCategoryById } from '@/services/taskCategoryService';

type TaskRow = {
  id: string;
  name: string;
  description: string;
  category_id: string;
  coin_reward: number;
  estimated_duration_minutes: number | null;
  created_at: string;
  archived_at: string | null;
};

export type CreateTaskInput = {
  name: string;
  description?: string;
  categoryId?: string;
  coinReward: number;
  estimatedDurationMinutes?: number | null;
};

export type UpdateTaskInput = {
  name?: string;
  description?: string;
  categoryId?: string;
  coinReward?: number;
  estimatedDurationMinutes?: number | null;
};

function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    coinReward: row.coin_reward,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

function createId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function validateName(name: string): string {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    throw new Error('Task name must not be blank.');
  }

  return trimmedName;
}

function validateCoinReward(coinReward: number): number {
  if (!Number.isInteger(coinReward) || coinReward <= 0) {
    throw new Error('Task coinReward must be an integer greater than 0.');
  }

  return coinReward;
}

function validateEstimatedDuration(estimatedDurationMinutes: number | null | undefined) {
  if (estimatedDurationMinutes == null) {
    return null;
  }

  if (!Number.isInteger(estimatedDurationMinutes) || estimatedDurationMinutes <= 0) {
    throw new Error('Task estimatedDurationMinutes must be null or an integer greater than 0.');
  }

  return estimatedDurationMinutes;
}

async function resolveActiveCategoryId(
  categoryId: string | undefined,
  db: SQLiteDatabase
): Promise<string> {
  const resolvedCategoryId = (categoryId ?? OTHER_TASK_CATEGORY_ID).trim();

  if (resolvedCategoryId.length === 0) {
    throw new Error('Task categoryId must not be blank.');
  }

  const category = await getTaskCategoryById(resolvedCategoryId, db);

  if (!category) {
    throw new Error(`Task category with id "${resolvedCategoryId}" does not exist.`);
  }

  if (category.archivedAt !== null) {
    throw new Error(`Task category with id "${resolvedCategoryId}" is archived.`);
  }

  return category.id;
}

async function getDatabase(): Promise<SQLiteDatabase> {
  return initDatabase();
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const task: Task = {
    id: createId(),
    name: validateName(input.name),
    description: input.description ?? '',
    categoryId: await resolveActiveCategoryId(input.categoryId, db),
    coinReward: validateCoinReward(input.coinReward),
    estimatedDurationMinutes: validateEstimatedDuration(input.estimatedDurationMinutes),
    createdAt: now,
    archivedAt: null,
  };

  await db.runAsync(
    `INSERT INTO tasks (
      id,
      name,
      description,
      category_id,
      coin_reward,
      estimated_duration_minutes,
      created_at,
      archived_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.name,
      task.description,
      task.categoryId,
      task.coinReward,
      task.estimatedDurationMinutes,
      task.createdAt,
      task.archivedAt,
    ]
  );

  return task;
}

export async function getTaskById(
  id: string,
  database?: SQLiteDatabase
): Promise<Task | null> {
  const db = database ?? (await getDatabase());
  const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);

  return row ? mapTaskRow(row) : null;
}

export async function getActiveTasks(): Promise<Task[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE archived_at IS NULL ORDER BY created_at DESC'
  );

  return rows.map(mapTaskRow);
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task | null> {
  const db = await getDatabase();
  const existingTask = await getTaskById(id, db);

  if (!existingTask) {
    return null;
  }

  const updatedTask: Task = {
    ...existingTask,
    name: input.name === undefined ? existingTask.name : validateName(input.name),
    description: input.description === undefined ? existingTask.description : input.description,
    categoryId:
      input.categoryId === undefined
        ? existingTask.categoryId
        : await resolveActiveCategoryId(input.categoryId, db),
    coinReward:
      input.coinReward === undefined
        ? existingTask.coinReward
        : validateCoinReward(input.coinReward),
    estimatedDurationMinutes:
      input.estimatedDurationMinutes === undefined
        ? existingTask.estimatedDurationMinutes
        : validateEstimatedDuration(input.estimatedDurationMinutes),
  };

  await db.runAsync(
    `UPDATE tasks
     SET name = ?,
         description = ?,
         category_id = ?,
         coin_reward = ?,
         estimated_duration_minutes = ?
     WHERE id = ?`,
    [
      updatedTask.name,
      updatedTask.description,
      updatedTask.categoryId,
      updatedTask.coinReward,
      updatedTask.estimatedDurationMinutes,
      updatedTask.id,
    ]
  );

  return updatedTask;
}

export async function archiveTask(id: string): Promise<Task | null> {
  const existingTask = await getTaskById(id);

  if (!existingTask) {
    return null;
  }

  const archivedAt = new Date().toISOString();
  const db = await getDatabase();

  await db.runAsync('UPDATE tasks SET archived_at = ? WHERE id = ?', [archivedAt, id]);

  return {
    ...existingTask,
    archivedAt,
  };
}
