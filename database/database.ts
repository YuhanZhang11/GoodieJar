import * as SQLite from 'expo-sqlite';

import { DEFAULT_TASK_CATEGORIES, OTHER_TASK_CATEGORY_ID } from './defaultTaskCategories';
import {
  createAllIndexes,
  createAllTables,
  createDailyTaskPlanCoinIntegrityTriggers,
  createDailyTaskPlanCategoryIntegrityTriggers,
  createTaskCoinRateIntegrityTriggers,
  createTaskCategoryIntegrityTriggers,
} from './schema';

const DATABASE_VERSION = 3;

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

    if (currentVersion < 3) {
      const taskColumns = await db.getAllAsync<TableColumnRow>('PRAGMA table_info(tasks)');
      const hasCoinsPerHour = taskColumns.some((column) => column.name === 'coins_per_hour');

      if (!hasCoinsPerHour) {
        await db.execAsync(
          'ALTER TABLE tasks ADD COLUMN coins_per_hour INTEGER CHECK (coins_per_hour > 0)'
        );
      }

      await db.execAsync(`
        UPDATE tasks
        SET coins_per_hour = coin_reward
        WHERE coins_per_hour IS NULL
      `);

      const missingTaskRateRow = await db.getFirstAsync<CountRow>(
        'SELECT COUNT(*) AS count FROM tasks WHERE coins_per_hour IS NULL OR coins_per_hour <= 0'
      );

      if ((missingTaskRateRow?.count ?? 0) > 0) {
        throw new Error('Task coins-per-hour backfill did not complete.');
      }

      const planColumns = await db.getAllAsync<TableColumnRow>(
        'PRAGMA table_info(daily_task_plans)'
      );
      const hasPlannedCoinAmount = planColumns.some(
        (column) => column.name === 'planned_coin_amount'
      );

      if (!hasPlannedCoinAmount) {
        await db.execAsync(
          `ALTER TABLE daily_task_plans
           ADD COLUMN planned_coin_amount INTEGER CHECK (planned_coin_amount > 0)`
        );
      }

      await db.execAsync(`
        UPDATE daily_task_plans
        SET planned_coin_amount = (
          SELECT CAST(
            (
              tasks.coins_per_hour * daily_task_plans.planned_duration_minutes + 59
            ) / 60 AS INTEGER
          )
          FROM tasks
          WHERE tasks.id = daily_task_plans.task_id
        )
        WHERE planned_coin_amount IS NULL
      `);

      const missingPlanCoinRow = await db.getFirstAsync<CountRow>(
        `SELECT COUNT(*) AS count
         FROM daily_task_plans
         WHERE planned_coin_amount IS NULL OR planned_coin_amount <= 0`
      );

      if ((missingPlanCoinRow?.count ?? 0) > 0) {
        throw new Error('DailyTaskPlan planned-coin backfill did not complete.');
      }
    }

    await db.execAsync(createAllIndexes);
    await db.execAsync(createTaskCategoryIntegrityTriggers);
    await db.execAsync(createTaskCoinRateIntegrityTriggers);
    await db.execAsync(createDailyTaskPlanCategoryIntegrityTriggers);
    await db.execAsync(createDailyTaskPlanCoinIntegrityTriggers);

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
