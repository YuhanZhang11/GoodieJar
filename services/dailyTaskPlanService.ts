import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from '@/database/database';
import type { DailyTaskPlan, Task, TaskCategory, TaskPriority } from '@/models/types';
import { getOrCreateDailyLog } from '@/services/dailyLogService';
import { getTaskById } from '@/services/taskService';
import { validateLocalDateKey } from '@/utils/localDate';

type TaskPlanDetailsRow = {
  plan_id: string;
  plan_task_id: string;
  plan_daily_log_id: string;
  plan_category_id: string;
  planned_duration_minutes: number;
  priority: TaskPriority;
  plan_created_at: string;
  task_name: string;
  task_description: string;
  task_category_id: string;
  task_coin_reward: number;
  task_estimated_duration_minutes: number | null;
  task_created_at: string;
  task_archived_at: string | null;
  category_name: string;
  category_is_system: number;
  category_created_at: string;
  category_archived_at: string | null;
};

type TaskPlanIdentityRow = {
  task_id: string;
  daily_log_id: string;
};

export type AddTaskToDateInput = {
  taskId: string;
  date: string;
  plannedDurationMinutes: number;
  priority: TaskPriority;
};

export type TaskPlanDetails = {
  plan: DailyTaskPlan;
  task: Task;
  category: TaskCategory;
};

const TASK_PLAN_DETAILS_SELECT = `
  SELECT
    plan.id AS plan_id,
    plan.task_id AS plan_task_id,
    plan.daily_log_id AS plan_daily_log_id,
    plan.category_id AS plan_category_id,
    plan.planned_duration_minutes,
    plan.priority,
    plan.created_at AS plan_created_at,
    task.name AS task_name,
    task.description AS task_description,
    task.category_id AS task_category_id,
    task.coin_reward AS task_coin_reward,
    task.estimated_duration_minutes AS task_estimated_duration_minutes,
    task.created_at AS task_created_at,
    task.archived_at AS task_archived_at,
    category.name AS category_name,
    category.is_system AS category_is_system,
    category.created_at AS category_created_at,
    category.archived_at AS category_archived_at
  FROM daily_task_plans AS plan
  INNER JOIN tasks AS task ON task.id = plan.task_id
  INNER JOIN task_categories AS category ON category.id = plan.category_id
`;

function mapTaskPlanDetailsRow(row: TaskPlanDetailsRow): TaskPlanDetails {
  return {
    plan: {
      id: row.plan_id,
      taskId: row.plan_task_id,
      dailyLogId: row.plan_daily_log_id,
      categoryId: row.plan_category_id,
      plannedDurationMinutes: row.planned_duration_minutes,
      priority: row.priority,
      createdAt: row.plan_created_at,
    },
    task: {
      id: row.plan_task_id,
      name: row.task_name,
      description: row.task_description,
      categoryId: row.task_category_id,
      coinReward: row.task_coin_reward,
      estimatedDurationMinutes: row.task_estimated_duration_minutes,
      createdAt: row.task_created_at,
      archivedAt: row.task_archived_at,
    },
    category: {
      id: row.plan_category_id,
      name: row.category_name,
      isSystem: row.category_is_system === 1,
      createdAt: row.category_created_at,
      archivedAt: row.category_archived_at,
    },
  };
}

function createId(): string {
  return `daily_task_plan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function validateId(id: string, fieldName: string): string {
  const trimmedId = id.trim();

  if (trimmedId.length === 0) {
    throw new Error(`${fieldName} must not be blank.`);
  }

  return trimmedId;
}

function validatePlannedDuration(plannedDurationMinutes: number): number {
  if (!Number.isInteger(plannedDurationMinutes) || plannedDurationMinutes <= 0) {
    throw new Error('DailyTaskPlan plannedDurationMinutes must be an integer greater than 0.');
  }

  return plannedDurationMinutes;
}

function validatePriority(priority: TaskPriority): TaskPriority {
  if (priority !== 'NORMAL' && priority !== 'IMPORTANT' && priority !== 'URGENT') {
    throw new Error('DailyTaskPlan priority must be NORMAL, IMPORTANT, or URGENT.');
  }

  return priority;
}

async function getDatabase(): Promise<SQLiteDatabase> {
  return initDatabase();
}

async function rollbackTransaction(db: SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync('ROLLBACK');
  } catch {
    // Closing the private connection will roll back any transaction still open.
  }
}

export async function getTaskPlanById(
  planId: string,
  database?: SQLiteDatabase
): Promise<TaskPlanDetails | null> {
  const validPlanId = validateId(planId, 'DailyTaskPlan id');
  const db = database ?? (await getDatabase());
  const row = await db.getFirstAsync<TaskPlanDetailsRow>(
    `${TASK_PLAN_DETAILS_SELECT} WHERE plan.id = ?`,
    [validPlanId]
  );

  return row ? mapTaskPlanDetailsRow(row) : null;
}

export async function addTaskToDate(input: AddTaskToDateInput): Promise<TaskPlanDetails> {
  const taskId = validateId(input.taskId, 'DailyTaskPlan taskId');
  const date = validateLocalDateKey(input.date, 'DailyTaskPlan date');
  const plannedDurationMinutes = validatePlannedDuration(input.plannedDurationMinutes);
  const priority = validatePriority(input.priority);
  const db = await initDatabase({ useNewConnection: true });
  let result: TaskPlanDetails | undefined;

  try {
    await db.withTransactionAsync(async () => {
      const task = await getTaskById(taskId, db);

      if (!task) {
        throw new Error(`Task with id "${taskId}" does not exist.`);
      }

      if (task.archivedAt !== null) {
        throw new Error(`Task with id "${taskId}" is archived and cannot be planned.`);
      }

      const dailyLog = await getOrCreateDailyLog(date, db);
      const planId = createId();
      const createdAt = new Date().toISOString();
      const insertResult = await db.runAsync(
        `INSERT OR IGNORE INTO daily_task_plans (
          id,
          task_id,
          daily_log_id,
          category_id,
          planned_duration_minutes,
          priority,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          planId,
          task.id,
          dailyLog.id,
          task.categoryId,
          plannedDurationMinutes,
          priority,
          createdAt,
        ]
      );

      if (insertResult.changes === 0) {
        throw new Error(`Task "${task.name}" is already planned for ${date}.`);
      }

      const createdPlan = await getTaskPlanById(planId, db);

      if (!createdPlan) {
        throw new Error('DailyTaskPlan could not be created.');
      }

      result = createdPlan;
    });
  } finally {
    await db.closeAsync();
  }

  if (!result) {
    throw new Error('Adding the Task to the date did not produce a result.');
  }

  return result;
}

export async function getTaskPlansByDate(date: string): Promise<TaskPlanDetails[]> {
  const validDate = validateLocalDateKey(date, 'DailyTaskPlan date');
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskPlanDetailsRow>(
    `${TASK_PLAN_DETAILS_SELECT}
     INNER JOIN daily_logs AS daily_log ON daily_log.id = plan.daily_log_id
     WHERE daily_log.date = ?
     ORDER BY plan.created_at ASC, plan.id ASC`,
    [validDate]
  );

  return rows.map(mapTaskPlanDetailsRow);
}

export async function removeTaskPlan(planId: string): Promise<boolean> {
  const validPlanId = validateId(planId, 'DailyTaskPlan id');
  const db = await initDatabase({ useNewConnection: true });
  let transactionOpen = false;

  try {
    await db.execAsync('BEGIN IMMEDIATE');
    transactionOpen = true;

    const plan = await db.getFirstAsync<TaskPlanIdentityRow>(
      'SELECT task_id, daily_log_id FROM daily_task_plans WHERE id = ?',
      [validPlanId]
    );

    if (!plan) {
      await db.execAsync('COMMIT');
      transactionOpen = false;
      return false;
    }

    const completion = await db.getFirstAsync<{ id: string }>(
      `SELECT id
       FROM coin_transactions
       WHERE type = ?
         AND task_id = ?
         AND daily_log_id = ?
       LIMIT 1`,
      ['EARN', plan.task_id, plan.daily_log_id]
    );

    if (completion) {
      throw new Error('Completed Task plans cannot be removed.');
    }

    const result = await db.runAsync('DELETE FROM daily_task_plans WHERE id = ?', [validPlanId]);
    await db.execAsync('COMMIT');
    transactionOpen = false;

    return result.changes > 0;
  } catch (error) {
    if (transactionOpen) {
      await rollbackTransaction(db);
      transactionOpen = false;
    }

    throw error;
  } finally {
    await db.closeAsync();
  }
}
