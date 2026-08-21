import * as SQLite from 'expo-sqlite';

import { DEFAULT_TASK_CATEGORIES, OTHER_TASK_CATEGORY_ID } from './defaultTaskCategories';
import {
  createAllIndexes,
  createAllTables,
  createCoinTransactionsV8MigrationTable,
  createDailyGoalsV9MigrationTable,
  createDailyTaskPlanCoinIntegrityTriggers,
  createDailyTaskPlanCategoryIntegrityTriggers,
  createDailyTaskPlanRewardSnapshotIntegrityTriggers,
  createDailyTaskPlansV7MigrationTable,
  createTaskCoinRateIntegrityTriggers,
  createTaskCategoryIntegrityTriggers,
  createTaskFocusIntegrityTriggers,
  createTaskSessionsTable,
} from './schema';

const DATABASE_VERSION = 9;

type UserVersionRow = {
  user_version: number;
};

type TableColumnRow = {
  name: string;
};

type CountRow = {
  count: number;
};

type BalanceRow = {
  balance: number;
};

type TableDefinitionRow = {
  sql: string | null;
};

type ForeignKeyViolationRow = {
  table: string;
  rowid: number | null;
  parent: string;
  fkid: number;
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
  const versionRow = await db.getFirstAsync<UserVersionRow>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `Database version ${currentVersion} is newer than supported version ${DATABASE_VERSION}.`
    );
  }

  const requiresReferencedTableRebuild = currentVersion < 9;
  let transactionOpen = false;

  // SQLite requires foreign-key enforcement to be disabled before the transaction
  // that replaces a referenced parent table. Integrity is checked before commit.
  if (requiresReferencedTableRebuild) {
    await db.execAsync('PRAGMA foreign_keys = OFF');
  }

  try {
    await db.execAsync('BEGIN IMMEDIATE');
    transactionOpen = true;

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

    if (currentVersion < 4) {
      const taskColumns = await db.getAllAsync<TableColumnRow>('PRAGMA table_info(tasks)');
      const hasIsFocused = taskColumns.some((column) => column.name === 'is_focused');

      if (!hasIsFocused) {
        await db.execAsync(
          `ALTER TABLE tasks
           ADD COLUMN is_focused INTEGER NOT NULL DEFAULT 0
           CHECK (is_focused IN (0, 1))`
        );
      }

      const planColumns = await db.getAllAsync<TableColumnRow>(
        'PRAGMA table_info(daily_task_plans)'
      );
      const hasRateSnapshot = planColumns.some(
        (column) => column.name === 'coins_per_hour_snapshot'
      );
      const hasFocusedSnapshot = planColumns.some(
        (column) => column.name === 'is_focused_snapshot'
      );
      const hasSuggestedRawCoinAmount = planColumns.some(
        (column) => column.name === 'suggested_raw_coin_amount'
      );
      const hasSuggestedCoinAmount = planColumns.some(
        (column) => column.name === 'suggested_coin_amount'
      );

      if (!hasRateSnapshot) {
        await db.execAsync(
          `ALTER TABLE daily_task_plans
           ADD COLUMN coins_per_hour_snapshot INTEGER
           CHECK (coins_per_hour_snapshot > 0)`
        );
      }

      if (!hasFocusedSnapshot) {
        await db.execAsync(
          `ALTER TABLE daily_task_plans
           ADD COLUMN is_focused_snapshot INTEGER NOT NULL DEFAULT 0
           CHECK (is_focused_snapshot IN (0, 1))`
        );
      }

      if (!hasSuggestedRawCoinAmount) {
        await db.execAsync(
          `ALTER TABLE daily_task_plans
           ADD COLUMN suggested_raw_coin_amount REAL
           CHECK (suggested_raw_coin_amount > 0)`
        );
      }

      if (!hasSuggestedCoinAmount) {
        await db.execAsync(
          `ALTER TABLE daily_task_plans
           ADD COLUMN suggested_coin_amount INTEGER
           CHECK (suggested_coin_amount > 0)`
        );
      }

      await db.execAsync(`
        UPDATE daily_task_plans
        SET coins_per_hour_snapshot = (
          SELECT tasks.coins_per_hour
          FROM tasks
          WHERE tasks.id = daily_task_plans.task_id
        )
        WHERE coins_per_hour_snapshot IS NULL
      `);

      // Existing plans used the prior linear suggestion, so keep that economic baseline.
      await db.execAsync(`
        UPDATE daily_task_plans
        SET is_focused_snapshot = 0
      `);

      await db.execAsync(`
        UPDATE daily_task_plans
        SET suggested_raw_coin_amount =
          coins_per_hour_snapshot * planned_duration_minutes / 60.0
        WHERE suggested_raw_coin_amount IS NULL
      `);

      await db.execAsync(`
        UPDATE daily_task_plans
        SET suggested_coin_amount = CAST(
          (
            coins_per_hour_snapshot * planned_duration_minutes + 59
          ) / 60 AS INTEGER
        )
        WHERE suggested_coin_amount IS NULL
      `);

      const invalidTaskFocusRow = await db.getFirstAsync<CountRow>(
        'SELECT COUNT(*) AS count FROM tasks WHERE is_focused IS NULL OR is_focused NOT IN (0, 1)'
      );
      const invalidPlanSnapshotRow = await db.getFirstAsync<CountRow>(
        `SELECT COUNT(*) AS count
         FROM daily_task_plans
         WHERE coins_per_hour_snapshot IS NULL
           OR coins_per_hour_snapshot <= 0
           OR is_focused_snapshot IS NULL
           OR is_focused_snapshot NOT IN (0, 1)
           OR suggested_raw_coin_amount IS NULL
           OR suggested_raw_coin_amount <= 0
           OR suggested_coin_amount IS NULL
           OR suggested_coin_amount <= 0`
      );

      if ((invalidTaskFocusRow?.count ?? 0) > 0) {
        throw new Error('Task Focused-mode backfill did not complete.');
      }

      if ((invalidPlanSnapshotRow?.count ?? 0) > 0) {
        throw new Error('DailyTaskPlan reward-snapshot backfill did not complete.');
      }
    }

    if (currentVersion < 5) {
      await db.execAsync(createTaskSessionsTable);
    }

    if (currentVersion < 6) {
      const sessionColumns = await db.getAllAsync<TableColumnRow>(
        'PRAGMA table_info(task_sessions)'
      );
      const hasExtendedAt = sessionColumns.some((column) => column.name === 'extended_at');
      const hasGoalNotificationId = sessionColumns.some(
        (column) => column.name === 'goal_notification_id'
      );

      if (!hasExtendedAt) {
        await db.execAsync('ALTER TABLE task_sessions ADD COLUMN extended_at TEXT');
      }

      if (!hasGoalNotificationId) {
        await db.execAsync('ALTER TABLE task_sessions ADD COLUMN goal_notification_id TEXT');
      }
    }

    if (currentVersion < 7) {
      const planTable = await db.getFirstAsync<TableDefinitionRow>(
        `SELECT sql
         FROM sqlite_master
         WHERE type = 'table' AND name = 'daily_task_plans'`
      );
      const hasLegacyTaskDateUniqueness = Boolean(
        planTable?.sql &&
          /UNIQUE\s*\(\s*daily_log_id\s*,\s*task_id\s*\)/i.test(planTable.sql)
      );

      if (hasLegacyTaskDateUniqueness) {
        const temporaryTable = await db.getFirstAsync<{ name: string }>(
          `SELECT name
           FROM sqlite_master
           WHERE type = 'table' AND name = 'daily_task_plans_v7_migration'`
        );

        if (temporaryTable) {
          throw new Error('DailyTaskPlan v7 migration table already exists.');
        }

        const beforeCountRow = await db.getFirstAsync<CountRow>(
          'SELECT COUNT(*) AS count FROM daily_task_plans'
        );

        await db.execAsync(createDailyTaskPlansV7MigrationTable);
        await db.execAsync(`
          INSERT INTO daily_task_plans_v7_migration (
            id,
            task_id,
            daily_log_id,
            category_id,
            planned_duration_minutes,
            planned_coin_amount,
            coins_per_hour_snapshot,
            is_focused_snapshot,
            suggested_raw_coin_amount,
            suggested_coin_amount,
            priority,
            created_at
          )
          SELECT
            id,
            task_id,
            daily_log_id,
            category_id,
            planned_duration_minutes,
            planned_coin_amount,
            coins_per_hour_snapshot,
            is_focused_snapshot,
            suggested_raw_coin_amount,
            suggested_coin_amount,
            priority,
            created_at
          FROM daily_task_plans
        `);

        const afterCountRow = await db.getFirstAsync<CountRow>(
          'SELECT COUNT(*) AS count FROM daily_task_plans_v7_migration'
        );

        if ((beforeCountRow?.count ?? 0) !== (afterCountRow?.count ?? 0)) {
          throw new Error('DailyTaskPlan v7 migration did not preserve every plan.');
        }

        await db.execAsync('DROP TABLE daily_task_plans');
        await db.execAsync(
          'ALTER TABLE daily_task_plans_v7_migration RENAME TO daily_task_plans'
        );
      }

      // Before v5, completed plans were identified by their sole task/date EARN.
      // Link those legacy completions to their plan before duplicate entries are allowed.
      await db.execAsync(`
        INSERT INTO task_sessions (
          id,
          task_plan_id,
          started_at,
          active_started_at,
          accumulated_seconds,
          ended_at,
          extended_at,
          goal_duration_seconds_snapshot,
          coins_per_hour_snapshot,
          is_focused_snapshot,
          suggested_raw_coin_amount_snapshot,
          suggested_coin_amount_snapshot,
          planned_coin_amount_snapshot,
          coin_transaction_id,
          goal_notification_id,
          created_at
        )
        SELECT
          'task_session_v7_' || plan.id,
          plan.id,
          completion.occurred_at,
          NULL,
          CASE
            WHEN completion.actual_duration_minutes IS NOT NULL
              AND completion.actual_duration_minutes > 0
            THEN completion.actual_duration_minutes * 60
            ELSE plan.planned_duration_minutes * 60
          END,
          completion.occurred_at,
          NULL,
          plan.planned_duration_minutes * 60,
          plan.coins_per_hour_snapshot,
          plan.is_focused_snapshot,
          plan.suggested_raw_coin_amount,
          plan.suggested_coin_amount,
          plan.planned_coin_amount,
          completion.id,
          NULL,
          completion.occurred_at
        FROM daily_task_plans AS plan
        INNER JOIN coin_transactions AS completion
          ON completion.id = (
            SELECT candidate.id
            FROM coin_transactions AS candidate
            WHERE candidate.type = 'EARN'
              AND candidate.task_id = plan.task_id
              AND candidate.daily_log_id = plan.daily_log_id
            ORDER BY candidate.occurred_at ASC, candidate.id ASC
            LIMIT 1
          )
        LEFT JOIN task_sessions AS existing_session
          ON existing_session.task_plan_id = plan.id
        WHERE existing_session.id IS NULL
      `);
    }

    if (currentVersion < 8) {
      const transactionColumns = await db.getAllAsync<TableColumnRow>(
        'PRAGMA table_info(coin_transactions)'
      );
      const hasDailyGoalId = transactionColumns.some(
        (column) => column.name === 'daily_goal_id'
      );
      const hasGoalBonusKind = transactionColumns.some(
        (column) => column.name === 'goal_bonus_kind'
      );

      if (!hasDailyGoalId || !hasGoalBonusKind) {
        const temporaryTable = await db.getFirstAsync<{ name: string }>(
          `SELECT name
           FROM sqlite_master
           WHERE type = 'table' AND name = 'coin_transactions_v8_migration'`
        );

        if (temporaryTable) {
          throw new Error('CoinTransaction v8 migration table already exists.');
        }

        const beforeCountRow = await db.getFirstAsync<CountRow>(
          'SELECT COUNT(*) AS count FROM coin_transactions'
        );
        const beforeBalanceRow = await db.getFirstAsync<BalanceRow>(
          `SELECT COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE -amount END), 0)
             AS balance
           FROM coin_transactions`
        );

        await db.execAsync(createCoinTransactionsV8MigrationTable);
        await db.execAsync(`
          INSERT INTO coin_transactions_v8_migration (
            id,
            type,
            amount,
            actual_duration_minutes,
            source_name,
            task_id,
            reward_id,
            achievement_id,
            daily_goal_id,
            goal_bonus_kind,
            daily_log_id,
            occurred_at
          )
          SELECT
            id,
            type,
            amount,
            actual_duration_minutes,
            source_name,
            task_id,
            reward_id,
            achievement_id,
            NULL,
            NULL,
            daily_log_id,
            occurred_at
          FROM coin_transactions
        `);

        const afterCountRow = await db.getFirstAsync<CountRow>(
          'SELECT COUNT(*) AS count FROM coin_transactions_v8_migration'
        );
        const afterBalanceRow = await db.getFirstAsync<BalanceRow>(
          `SELECT COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE -amount END), 0)
             AS balance
           FROM coin_transactions_v8_migration`
        );

        if ((beforeCountRow?.count ?? 0) !== (afterCountRow?.count ?? 0)) {
          throw new Error('CoinTransaction v8 migration did not preserve every transaction.');
        }

        if ((beforeBalanceRow?.balance ?? 0) !== (afterBalanceRow?.balance ?? 0)) {
          throw new Error('CoinTransaction v8 migration changed the ledger balance.');
        }

        await db.execAsync('DROP TABLE coin_transactions');
        await db.execAsync(
          'ALTER TABLE coin_transactions_v8_migration RENAME TO coin_transactions'
        );
      }
    }

    if (currentVersion < 9) {
      const dailyGoalColumns = await db.getAllAsync<TableColumnRow>(
        'PRAGMA table_info(daily_goals)'
      );
      const hasLockedAt = dailyGoalColumns.some((column) => column.name === 'locked_at');
      const hasFinishedAt = dailyGoalColumns.some((column) => column.name === 'finished_at');
      const hasFinalFocusSeconds = dailyGoalColumns.some(
        (column) => column.name === 'final_focus_seconds_snapshot'
      );
      const hasFinalCompletedTaskCount = dailyGoalColumns.some(
        (column) => column.name === 'final_completed_task_count_snapshot'
      );
      const requiresDailyGoalV9Rebuild =
        hasLockedAt ||
        !hasFinishedAt ||
        !hasFinalFocusSeconds ||
        !hasFinalCompletedTaskCount;

      if (requiresDailyGoalV9Rebuild) {
        const temporaryTable = await db.getFirstAsync<{ name: string }>(
          `SELECT name
           FROM sqlite_master
           WHERE type = 'table' AND name = 'daily_goals_v9_migration'`
        );

        if (temporaryTable) {
          throw new Error('DailyGoal v9 migration table already exists.');
        }

        const beforeCountRow = await db.getFirstAsync<CountRow>(
          'SELECT COUNT(*) AS count FROM daily_goals'
        );
        const beforeTransactionCountRow = await db.getFirstAsync<CountRow>(
          'SELECT COUNT(*) AS count FROM coin_transactions'
        );
        const beforeBalanceRow = await db.getFirstAsync<BalanceRow>(
          `SELECT COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE -amount END), 0)
             AS balance
           FROM coin_transactions`
        );

        await db.execAsync(createDailyGoalsV9MigrationTable);
        await db.execAsync(`
          INSERT INTO daily_goals_v9_migration (
            id,
            daily_log_id,
            focus_goal_minutes,
            task_goal_count,
            typical_hourly_rate_snapshot,
            focus_bonus_amount_snapshot,
            task_bonus_amount_snapshot,
            combo_bonus_amount_snapshot,
            final_focus_seconds_snapshot,
            final_completed_task_count_snapshot,
            finished_at,
            created_at,
            updated_at
          )
          SELECT
            id,
            daily_log_id,
            focus_goal_minutes,
            task_goal_count,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            created_at,
            updated_at
          FROM daily_goals
        `);

        const afterCountRow = await db.getFirstAsync<CountRow>(
          'SELECT COUNT(*) AS count FROM daily_goals_v9_migration'
        );
        const missingGoalIdRow = await db.getFirstAsync<CountRow>(
          `SELECT COUNT(*) AS count
           FROM daily_goals AS old_goal
           LEFT JOIN daily_goals_v9_migration AS new_goal ON new_goal.id = old_goal.id
           WHERE new_goal.id IS NULL`
        );

        if ((beforeCountRow?.count ?? 0) !== (afterCountRow?.count ?? 0)) {
          throw new Error('DailyGoal v9 migration did not preserve every goal.');
        }

        if ((missingGoalIdRow?.count ?? 0) !== 0) {
          throw new Error('DailyGoal v9 migration did not preserve every goal ID.');
        }

        await db.execAsync('DROP TABLE daily_goals');
        await db.execAsync(
          'ALTER TABLE daily_goals_v9_migration RENAME TO daily_goals'
        );

        const afterTransactionCountRow = await db.getFirstAsync<CountRow>(
          'SELECT COUNT(*) AS count FROM coin_transactions'
        );
        const afterBalanceRow = await db.getFirstAsync<BalanceRow>(
          `SELECT COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE -amount END), 0)
             AS balance
           FROM coin_transactions`
        );

        if (
          (beforeTransactionCountRow?.count ?? 0) !==
          (afterTransactionCountRow?.count ?? 0)
        ) {
          throw new Error('DailyGoal v9 migration changed CoinTransaction history.');
        }

        if ((beforeBalanceRow?.balance ?? 0) !== (afterBalanceRow?.balance ?? 0)) {
          throw new Error('DailyGoal v9 migration changed the ledger balance.');
        }
      }
    }

    await db.execAsync(createAllIndexes);
    await db.execAsync(createTaskCategoryIntegrityTriggers);
    await db.execAsync(createTaskCoinRateIntegrityTriggers);
    await db.execAsync(createTaskFocusIntegrityTriggers);
    await db.execAsync(createDailyTaskPlanCategoryIntegrityTriggers);
    await db.execAsync(createDailyTaskPlanCoinIntegrityTriggers);
    await db.execAsync(createDailyTaskPlanRewardSnapshotIntegrityTriggers);

    const foreignKeyViolations = await db.getAllAsync<ForeignKeyViolationRow>(
      'PRAGMA foreign_key_check'
    );

    if (foreignKeyViolations.length > 0) {
      const firstViolation = foreignKeyViolations[0];
      throw new Error(
        `Database migration produced a foreign-key violation in ${firstViolation.table}.`
      );
    }

    if (currentVersion < DATABASE_VERSION) {
      await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    }

    await db.execAsync('COMMIT');
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) {
      await db.execAsync('ROLLBACK');
    }

    throw error;
  } finally {
    if (requiresReferencedTableRebuild) {
      await db.execAsync('PRAGMA foreign_keys = ON');
    }
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
