import * as SQLite from 'expo-sqlite';

import { DEFAULT_TASK_CATEGORIES, OTHER_TASK_CATEGORY_ID } from './defaultTaskCategories';
import {
  createAllIndexes,
  createAllTables,
  createDailyTaskPlanCategoryIntegrityTriggers,
  createTaskCategoryIntegrityTriggers,
} from './schema';

const DATABASE_VERSION = 2;

type UserVersionRow = {
  user_version: number;
};

type TableColumnRow = {
  name: string;
};

type CountRow = {
  count: number;
};

let databaseSetupPromise: Promise<void> | null = null;

async function seedDefaultTaskCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  const createdAt = new Date().toISOString();

  for (const category of DEFAULT_TASK_CATEGORIES) {
    await db.runAsync(
      `INSERT OR IGNORE INTO task_categories (
        id,
        name,
        is_system,
        created_at,
        archived_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [category.id, category.name, 1, createdAt, null]
    );
  }
}

async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('BEGIN IMMEDIATE');

  try {
    const versionRow = await db.getFirstAsync<UserVersionRow>('PRAGMA user_version');
    const currentVersion = versionRow?.user_version ?? 0;

    if (currentVersion > DATABASE_VERSION) {
      throw new Error(
        `Database version ${currentVersion} is newer than supported version ${DATABASE_VERSION}.`
      );
    }

    await db.execAsync(createAllTables);
    await seedDefaultTaskCategories(db);

    if (currentVersion < 1) {
      const taskColumns = await db.getAllAsync<TableColumnRow>('PRAGMA table_info(tasks)');
      const hasCategoryId = taskColumns.some((column) => column.name === 'category_id');

      if (!hasCategoryId) {
        await db.execAsync(
          'ALTER TABLE tasks ADD COLUMN category_id TEXT REFERENCES task_categories(id)'
        );
      }

      await db.runAsync('UPDATE tasks SET category_id = ? WHERE category_id IS NULL', [
        OTHER_TASK_CATEGORY_ID,
      ]);
    }

    if (currentVersion < 2) {
      const planColumns = await db.getAllAsync<TableColumnRow>(
        'PRAGMA table_info(daily_task_plans)'
      );
      const hasCategoryId = planColumns.some((column) => column.name === 'category_id');

      if (!hasCategoryId) {
        await db.execAsync(
          'ALTER TABLE daily_task_plans ADD COLUMN category_id TEXT REFERENCES task_categories(id)'
        );
      }

      await db.execAsync(`
        UPDATE daily_task_plans
        SET category_id = (
          SELECT tasks.category_id
          FROM tasks
          WHERE tasks.id = daily_task_plans.task_id
        )
        WHERE category_id IS NULL
      `);

      const missingCategoryRow = await db.getFirstAsync<CountRow>(
        'SELECT COUNT(*) AS count FROM daily_task_plans WHERE category_id IS NULL'
      );

      if ((missingCategoryRow?.count ?? 0) > 0) {
        throw new Error('DailyTaskPlan category backfill did not complete.');
      }
    }

    await db.execAsync(createAllIndexes);
    await db.execAsync(createTaskCategoryIntegrityTriggers);
    await db.execAsync(createDailyTaskPlanCategoryIntegrityTriggers);

    if (currentVersion < DATABASE_VERSION) {
      await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

async function setUpDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
  await migrateDatabase(db);
}

function ensureDatabaseSetup(db: SQLite.SQLiteDatabase): Promise<void> {
  if (!databaseSetupPromise) {
    databaseSetupPromise = setUpDatabase(db).catch((error) => {
      databaseSetupPromise = null;
      throw error;
    });
  }

  return databaseSetupPromise;
}

export async function initDatabase(options?: SQLite.SQLiteOpenOptions) {
  const db = await SQLite.openDatabaseAsync('goodiejar.db', options);

  await ensureDatabaseSetup(db);

  // Foreign-key enforcement is connection-specific.
  await db.execAsync('PRAGMA foreign_keys = ON');

  return db;
}
