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

export const createCoinTransactionsTable = `
  CREATE TABLE IF NOT EXISTS coin_transactions (
    id TEXT PRIMARY KEY NOT NULL,

    type TEXT NOT NULL
      CHECK (type IN ('EARN', 'SPEND')),

    amount INTEGER NOT NULL,
    actual_duration_minutes INTEGER,

    source_name TEXT NOT NULL,

    task_id TEXT,
    reward_id TEXT,
    achievement_id TEXT,

    daily_log_id TEXT NOT NULL,
    occurred_at TEXT NOT NULL,

    FOREIGN KEY (task_id)
      REFERENCES tasks(id)
      ON DELETE SET NULL,

    FOREIGN KEY (reward_id)
      REFERENCES rewards(id)
      ON DELETE SET NULL,

    FOREIGN KEY (achievement_id)
      REFERENCES achievements(id)
      ON DELETE SET NULL,

    FOREIGN KEY (daily_log_id)
      REFERENCES daily_logs(id)
  );
`;

export const createDailyTaskPlansTable = `
  CREATE TABLE IF NOT EXISTS daily_task_plans (
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

    UNIQUE (daily_log_id, task_id),

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
  ${createCoinTransactionsTable}
  ${createDailyTaskPlansTable}
`;
