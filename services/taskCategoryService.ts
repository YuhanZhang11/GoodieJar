import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from '@/database/database';
import { OTHER_TASK_CATEGORY_ID } from '@/database/defaultTaskCategories';
import type { TaskCategory } from '@/models/types';

type TaskCategoryRow = {
  id: string;
  name: string;
  is_system: number;
  created_at: string;
  archived_at: string | null;
};

export type CreateTaskCategoryInput = {
  name: string;
};

export type UpdateTaskCategoryInput = {
  name: string;
};

function mapTaskCategoryRow(row: TaskCategoryRow): TaskCategory {
  return {
    id: row.id,
    name: row.name,
    isSystem: row.is_system === 1,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}

function createId(): string {
  return `task_category_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function validateName(name: string): string {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    throw new Error('Task category name must not be blank.');
  }

  return trimmedName;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

async function getDatabase(): Promise<SQLiteDatabase> {
  return initDatabase();
}

async function assertNameIsAvailable(
  name: string,
  db: SQLiteDatabase,
  excludingId?: string
): Promise<void> {
  const duplicate = await db.getFirstAsync<{ id: string }>(
    `SELECT id
     FROM task_categories
     WHERE archived_at IS NULL
       AND LOWER(TRIM(name)) = LOWER(?)
       AND (? IS NULL OR id != ?)`,
    [name, excludingId ?? null, excludingId ?? null]
  );

  if (duplicate) {
    throw new Error(`An active Task category named "${name}" already exists.`);
  }
}

export async function getActiveTaskCategories(): Promise<TaskCategory[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskCategoryRow>(
    `SELECT *
     FROM task_categories
     WHERE archived_at IS NULL
     ORDER BY is_system DESC, name COLLATE NOCASE ASC`
  );

  return rows.map(mapTaskCategoryRow);
}

export async function getTaskCategoryById(
  id: string,
  database?: SQLiteDatabase
): Promise<TaskCategory | null> {
  const categoryId = id.trim();

  if (categoryId.length === 0) {
    throw new Error('Task category id must not be blank.');
  }

  const db = database ?? (await getDatabase());
  const row = await db.getFirstAsync<TaskCategoryRow>(
    'SELECT * FROM task_categories WHERE id = ?',
    [categoryId]
  );

  return row ? mapTaskCategoryRow(row) : null;
}

export async function createTaskCategory(
  input: CreateTaskCategoryInput
): Promise<TaskCategory> {
  const name = validateName(input.name);
  const db = await getDatabase();
  await assertNameIsAvailable(name, db);

  const category: TaskCategory = {
    id: createId(),
    name,
    isSystem: false,
    createdAt: new Date().toISOString(),
    archivedAt: null,
  };

  try {
    await db.runAsync(
      `INSERT INTO task_categories (
        id,
        name,
        is_system,
        created_at,
        archived_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [category.id, category.name, 0, category.createdAt, category.archivedAt]
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error(`An active Task category named "${name}" already exists.`);
    }

    throw error;
  }

  return category;
}

export async function updateTaskCategory(
  id: string,
  input: UpdateTaskCategoryInput
): Promise<TaskCategory | null> {
  const db = await getDatabase();
  const existingCategory = await getTaskCategoryById(id, db);

  if (!existingCategory) {
    return null;
  }

  if (existingCategory.archivedAt !== null) {
    throw new Error('Archived Task categories cannot be updated.');
  }

  if (existingCategory.id === OTHER_TASK_CATEGORY_ID) {
    throw new Error('The default Other Task category cannot be updated.');
  }

  const name = validateName(input.name);
  await assertNameIsAvailable(name, db, existingCategory.id);

  try {
    await db.runAsync('UPDATE task_categories SET name = ? WHERE id = ?', [
      name,
      existingCategory.id,
    ]);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error(`An active Task category named "${name}" already exists.`);
    }

    throw error;
  }

  return { ...existingCategory, name };
}

export async function archiveTaskCategory(id: string): Promise<TaskCategory | null> {
  const db = await getDatabase();
  const existingCategory = await getTaskCategoryById(id, db);

  if (!existingCategory) {
    return null;
  }

  if (existingCategory.archivedAt !== null) {
    return existingCategory;
  }

  if (existingCategory.id === OTHER_TASK_CATEGORY_ID) {
    throw new Error('The default Other Task category cannot be archived.');
  }

  const archivedAt = new Date().toISOString();
  await db.runAsync('UPDATE task_categories SET archived_at = ? WHERE id = ?', [
    archivedAt,
    existingCategory.id,
  ]);

  return { ...existingCategory, archivedAt };
}
