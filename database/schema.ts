export const createTasksTable = `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,

    coin_reward INTEGER NOT NULL,
    estimated_duration_minutes INTEGER,

    created_at TEXT NOT NULL,
    archived_at TEXT
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

export const createAllTables = `
  ${createTasksTable}
  ${createRewardsTable}
  ${createDailyLogsTable}
  ${createAchievementsTable}
  ${createCoinTransactionsTable}
`;