export const createTaskCategoriesTable = `
  CREATE TABLE IF NOT EXISTS task_categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    is_system INTEGER NOT NULL
      CHECK (is_system IN (0, 1)),
    created_at TEXT NOT NULL,
    archived_at TEXT
  );
`;

export const createTasksTable = `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id TEXT NOT NULL,

    coin_reward INTEGER NOT NULL,
    coins_per_hour INTEGER NOT NULL
      CHECK (coins_per_hour > 0),
    is_focused INTEGER NOT NULL DEFAULT 0
      CHECK (is_focused IN (0, 1)),
    estimated_duration_minutes INTEGER,

    created_at TEXT NOT NULL,
    archived_at TEXT,

    FOREIGN KEY (category_id)
      REFERENCES task_categories(id)
  );
`;

export const createRewardsTable = `
  CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,

    coin_cost INTEGER NOT NULL,
    estimated_duration_minutes INTEGER,

    created_at TEXT NOT NULL,
    archived_at TEXT
  );
`;

export const createDailyLogsTable = `
  CREATE TABLE IF NOT EXISTS daily_logs (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL UNIQUE,

    mental_exhaustion INTEGER
  );
`;

export const createAchievementsTable = `
  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,

    coin_bonus INTEGER NOT NULL,

    achieved_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    archived_at TEXT
  );
`;

function createDailyGoalsTableSql(
  tableName: 'daily_goals' | 'daily_goals_v9_migration'
): string {
  return `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    id TEXT PRIMARY KEY NOT NULL,
    daily_log_id TEXT NOT NULL UNIQUE,
    focus_goal_minutes INTEGER NOT NULL
      CHECK (focus_goal_minutes >= 1 AND focus_goal_minutes <= 1439),
    task_goal_count INTEGER NOT NULL
      CHECK (task_goal_count >= 3),
    typical_hourly_rate_snapshot REAL
      CHECK (typical_hourly_rate_snapshot IS NULL OR typical_hourly_rate_snapshot > 0),
    focus_bonus_amount_snapshot INTEGER
      CHECK (focus_bonus_amount_snapshot IS NULL OR focus_bonus_amount_snapshot >= 0),
    task_bonus_amount_snapshot INTEGER
      CHECK (task_bonus_amount_snapshot IS NULL OR task_bonus_amount_snapshot >= 0),
    combo_bonus_amount_snapshot INTEGER
      CHECK (combo_bonus_amount_snapshot IS NULL OR combo_bonus_amount_snapshot >= 0),
    final_focus_seconds_snapshot REAL
      CHECK (final_focus_seconds_snapshot IS NULL OR final_focus_seconds_snapshot >= 0),
    final_completed_task_count_snapshot INTEGER
      CHECK (
        final_completed_task_count_snapshot IS NULL
        OR final_completed_task_count_snapshot >= 0
      ),
    finished_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    CHECK (
      (
        finished_at IS NULL
        AND typical_hourly_rate_snapshot IS NULL
        AND focus_bonus_amount_snapshot IS NULL
        AND task_bonus_amount_snapshot IS NULL
        AND combo_bonus_amount_snapshot IS NULL
        AND final_focus_seconds_snapshot IS NULL
        AND final_completed_task_count_snapshot IS NULL
      )
      OR
      (
        finished_at IS NOT NULL
        AND typical_hourly_rate_snapshot IS NOT NULL
        AND focus_bonus_amount_snapshot IS NOT NULL
        AND task_bonus_amount_snapshot IS NOT NULL
        AND combo_bonus_amount_snapshot IS NOT NULL
        AND final_focus_seconds_snapshot IS NOT NULL
        AND final_completed_task_count_snapshot IS NOT NULL
      )
    ),

    FOREIGN KEY (daily_log_id)
      REFERENCES daily_logs(id)
      ON DELETE CASCADE
  );
`;
}

export const createDailyGoalsTable = createDailyGoalsTableSql('daily_goals');

export const createDailyGoalsV9MigrationTable =
  createDailyGoalsTableSql('daily_goals_v9_migration');

function createCoinTransactionsTableSql(
  tableName: 'coin_transactions' | 'coin_transactions_v8_migration'
): string {
  return `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    id TEXT PRIMARY KEY NOT NULL,

    type TEXT NOT NULL
      CHECK (type IN ('EARN', 'SPEND')),

    amount INTEGER NOT NULL,
    actual_duration_minutes INTEGER,

    source_name TEXT NOT NULL,

    task_id TEXT,
    reward_id TEXT,
    achievement_id TEXT,
    daily_goal_id TEXT,
    goal_bonus_kind TEXT
      CHECK (goal_bonus_kind IS NULL OR goal_bonus_kind IN ('FOCUS', 'TASK', 'COMBO')),

    daily_log_id TEXT NOT NULL,
    occurred_at TEXT NOT NULL,

    CHECK (
      (task_id IS NOT NULL)
      + (reward_id IS NOT NULL)
      + (achievement_id IS NOT NULL)
      + (daily_goal_id IS NOT NULL)
      = 1
    ),

    CHECK (
      (daily_goal_id IS NOT NULL AND goal_bonus_kind IN ('FOCUS', 'TASK', 'COMBO'))
      OR (daily_goal_id IS NULL AND goal_bonus_kind IS NULL)
    ),

    CHECK (daily_goal_id IS NULL OR type = 'EARN'),

    FOREIGN KEY (task_id)
      REFERENCES tasks(id)
      ON DELETE SET NULL,

    FOREIGN KEY (reward_id)
      REFERENCES rewards(id)
      ON DELETE SET NULL,

    FOREIGN KEY (achievement_id)
      REFERENCES achievements(id)
      ON DELETE SET NULL,

    FOREIGN KEY (daily_goal_id)
      REFERENCES daily_goals(id),

    FOREIGN KEY (daily_log_id)
      REFERENCES daily_logs(id)
  );
`;
}

export const createCoinTransactionsTable =
  createCoinTransactionsTableSql('coin_transactions');

export const createCoinTransactionsV8MigrationTable =
  createCoinTransactionsTableSql('coin_transactions_v8_migration');

function createDailyTaskPlansTableSql(
  tableName: 'daily_task_plans' | 'daily_task_plans_v7_migration'
): string {
  return `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    daily_log_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    planned_duration_minutes INTEGER NOT NULL
      CHECK (planned_duration_minutes > 0),
    planned_coin_amount INTEGER NOT NULL
      CHECK (planned_coin_amount > 0),
    coins_per_hour_snapshot INTEGER NOT NULL
      CHECK (coins_per_hour_snapshot > 0),
    is_focused_snapshot INTEGER NOT NULL
      CHECK (is_focused_snapshot IN (0, 1)),
    suggested_raw_coin_amount REAL NOT NULL
      CHECK (suggested_raw_coin_amount > 0),
    suggested_coin_amount INTEGER NOT NULL
      CHECK (suggested_coin_amount > 0),
    priority TEXT NOT NULL
      CHECK (priority IN ('NORMAL', 'IMPORTANT', 'URGENT')),
    created_at TEXT NOT NULL,

    FOREIGN KEY (task_id)
      REFERENCES tasks(id)
      ON DELETE CASCADE,

    FOREIGN KEY (daily_log_id)
      REFERENCES daily_logs(id)
      ON DELETE CASCADE,

    FOREIGN KEY (category_id)
      REFERENCES task_categories(id)
  );
`;
}

export const createDailyTaskPlansTable = createDailyTaskPlansTableSql('daily_task_plans');

export const createDailyTaskPlansV7MigrationTable = createDailyTaskPlansTableSql(
  'daily_task_plans_v7_migration'
);

export const createTaskSessionsTable = `
  CREATE TABLE IF NOT EXISTS task_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    task_plan_id TEXT NOT NULL,

    started_at TEXT NOT NULL,
    active_started_at TEXT,
    accumulated_seconds REAL NOT NULL
      CHECK (accumulated_seconds >= 0),
    ended_at TEXT,
    extended_at TEXT,

    goal_duration_seconds_snapshot INTEGER NOT NULL
      CHECK (goal_duration_seconds_snapshot > 0),
    coins_per_hour_snapshot INTEGER NOT NULL
      CHECK (coins_per_hour_snapshot > 0),
    is_focused_snapshot INTEGER NOT NULL
      CHECK (is_focused_snapshot IN (0, 1)),
    suggested_raw_coin_amount_snapshot REAL NOT NULL
      CHECK (suggested_raw_coin_amount_snapshot > 0),
    suggested_coin_amount_snapshot INTEGER NOT NULL
      CHECK (suggested_coin_amount_snapshot > 0),
    planned_coin_amount_snapshot INTEGER NOT NULL
      CHECK (planned_coin_amount_snapshot > 0),

    coin_transaction_id TEXT,
    goal_notification_id TEXT,
    created_at TEXT NOT NULL,

    CHECK (ended_at IS NULL OR active_started_at IS NULL),

    FOREIGN KEY (task_plan_id)
      REFERENCES daily_task_plans(id),

    FOREIGN KEY (coin_transaction_id)
      REFERENCES coin_transactions(id)
  );
`;

export const createAllIndexes = `
  CREATE UNIQUE INDEX IF NOT EXISTS task_categories_active_name_unique
    ON task_categories (LOWER(TRIM(name)))
    WHERE archived_at IS NULL;

  CREATE INDEX IF NOT EXISTS tasks_category_id_index
    ON tasks (category_id);

  CREATE INDEX IF NOT EXISTS daily_task_plans_task_id_index
    ON daily_task_plans (task_id);

  CREATE INDEX IF NOT EXISTS daily_task_plans_category_id_index
    ON daily_task_plans (category_id);

  CREATE INDEX IF NOT EXISTS daily_task_plans_daily_log_id_index
    ON daily_task_plans (daily_log_id, created_at, id);

  CREATE UNIQUE INDEX IF NOT EXISTS task_sessions_task_plan_id_unique
    ON task_sessions (task_plan_id);

  CREATE INDEX IF NOT EXISTS task_sessions_open_lookup_index
    ON task_sessions (ended_at)
    WHERE ended_at IS NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS task_sessions_single_open_unique
    ON task_sessions (1)
    WHERE ended_at IS NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS coin_transactions_daily_goal_bonus_unique
    ON coin_transactions (daily_goal_id, goal_bonus_kind)
    WHERE daily_goal_id IS NOT NULL;
`;

export const createTaskCategoryIntegrityTriggers = `
  CREATE TRIGGER IF NOT EXISTS tasks_category_id_required_on_insert
  BEFORE INSERT ON tasks
  WHEN NEW.category_id IS NULL
  BEGIN
    SELECT RAISE(ABORT, 'tasks.category_id must not be null');
  END;

  CREATE TRIGGER IF NOT EXISTS tasks_category_id_required_on_update
  BEFORE UPDATE OF category_id ON tasks
  WHEN NEW.category_id IS NULL
  BEGIN
    SELECT RAISE(ABORT, 'tasks.category_id must not be null');
  END;
`;

export const createTaskCoinRateIntegrityTriggers = `
  CREATE TRIGGER IF NOT EXISTS tasks_coins_per_hour_required_on_insert
  BEFORE INSERT ON tasks
  WHEN NEW.coins_per_hour IS NULL OR NEW.coins_per_hour <= 0
  BEGIN
    SELECT RAISE(ABORT, 'tasks.coins_per_hour must be greater than 0');
  END;

  CREATE TRIGGER IF NOT EXISTS tasks_coins_per_hour_required_on_update
  BEFORE UPDATE OF coins_per_hour ON tasks
  WHEN NEW.coins_per_hour IS NULL OR NEW.coins_per_hour <= 0
  BEGIN
    SELECT RAISE(ABORT, 'tasks.coins_per_hour must be greater than 0');
  END;
`;

export const createDailyTaskPlanCategoryIntegrityTriggers = `
  CREATE TRIGGER IF NOT EXISTS daily_task_plans_category_id_required_on_insert
  BEFORE INSERT ON daily_task_plans
  WHEN NEW.category_id IS NULL
  BEGIN
    SELECT RAISE(ABORT, 'daily_task_plans.category_id must not be null');
  END;

  CREATE TRIGGER IF NOT EXISTS daily_task_plans_category_id_required_on_update
  BEFORE UPDATE OF category_id ON daily_task_plans
  WHEN NEW.category_id IS NULL
  BEGIN
    SELECT RAISE(ABORT, 'daily_task_plans.category_id must not be null');
  END;
`;

export const createDailyTaskPlanCoinIntegrityTriggers = `
  CREATE TRIGGER IF NOT EXISTS daily_task_plans_planned_coin_amount_required_on_insert
  BEFORE INSERT ON daily_task_plans
  WHEN NEW.planned_coin_amount IS NULL OR NEW.planned_coin_amount <= 0
  BEGIN
    SELECT RAISE(ABORT, 'daily_task_plans.planned_coin_amount must be greater than 0');
  END;

  CREATE TRIGGER IF NOT EXISTS daily_task_plans_planned_coin_amount_required_on_update
  BEFORE UPDATE OF planned_coin_amount ON daily_task_plans
  WHEN NEW.planned_coin_amount IS NULL OR NEW.planned_coin_amount <= 0
  BEGIN
    SELECT RAISE(ABORT, 'daily_task_plans.planned_coin_amount must be greater than 0');
  END;
`;

export const createTaskFocusIntegrityTriggers = `
  CREATE TRIGGER IF NOT EXISTS tasks_is_focused_required_on_insert
  BEFORE INSERT ON tasks
  WHEN NEW.is_focused IS NULL OR NEW.is_focused NOT IN (0, 1)
  BEGIN
    SELECT RAISE(ABORT, 'tasks.is_focused must be 0 or 1');
  END;

  CREATE TRIGGER IF NOT EXISTS tasks_is_focused_required_on_update
  BEFORE UPDATE OF is_focused ON tasks
  WHEN NEW.is_focused IS NULL OR NEW.is_focused NOT IN (0, 1)
  BEGIN
    SELECT RAISE(ABORT, 'tasks.is_focused must be 0 or 1');
  END;
`;

export const createDailyTaskPlanRewardSnapshotIntegrityTriggers = `
  CREATE TRIGGER IF NOT EXISTS daily_task_plans_reward_snapshots_required_on_insert
  BEFORE INSERT ON daily_task_plans
  WHEN NEW.coins_per_hour_snapshot IS NULL
    OR NEW.coins_per_hour_snapshot <= 0
    OR NEW.is_focused_snapshot IS NULL
    OR NEW.is_focused_snapshot NOT IN (0, 1)
    OR NEW.suggested_raw_coin_amount IS NULL
    OR NEW.suggested_raw_coin_amount <= 0
    OR NEW.suggested_coin_amount IS NULL
    OR NEW.suggested_coin_amount <= 0
  BEGIN
    SELECT RAISE(ABORT, 'daily_task_plans reward snapshots are invalid');
  END;

  CREATE TRIGGER IF NOT EXISTS daily_task_plans_reward_snapshots_required_on_update
  BEFORE UPDATE OF coins_per_hour_snapshot, is_focused_snapshot,
    suggested_raw_coin_amount, suggested_coin_amount
  ON daily_task_plans
  WHEN NEW.coins_per_hour_snapshot IS NULL
    OR NEW.coins_per_hour_snapshot <= 0
    OR NEW.is_focused_snapshot IS NULL
    OR NEW.is_focused_snapshot NOT IN (0, 1)
    OR NEW.suggested_raw_coin_amount IS NULL
    OR NEW.suggested_raw_coin_amount <= 0
    OR NEW.suggested_coin_amount IS NULL
    OR NEW.suggested_coin_amount <= 0
  BEGIN
    SELECT RAISE(ABORT, 'daily_task_plans reward snapshots are invalid');
  END;
`;

export const createAllTables = `
  ${createTaskCategoriesTable}
  ${createTasksTable}
  ${createRewardsTable}
  ${createDailyLogsTable}
  ${createAchievementsTable}
  ${createDailyGoalsTable}
  ${createCoinTransactionsTable}
  ${createDailyTaskPlansTable}
  ${createTaskSessionsTable}
`;
