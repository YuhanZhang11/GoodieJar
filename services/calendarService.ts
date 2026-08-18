import { initDatabase } from '@/database/database';
import { getLocalDateKey } from '@/utils/localDate';
import { parseTimestamp } from '@/utils/timestamp';

export type CalendarEventKind = 'TASK' | 'ACHIEVEMENT' | 'REWARD';

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  date: string;
  name: string;
  amount: number;
  description: string | null;
  occurredAt: string;
};

type TransactionCalendarRow = {
  id: string;
  type: 'EARN' | 'SPEND';
  amount: number;
  source_name: string;
  task_id: string | null;
  reward_id: string | null;
  occurred_at: string;
  daily_log_date: string;
};

type AchievementCalendarRow = {
  id: string;
  name: string;
  description: string;
  coin_bonus: number;
  achieved_at: string;
};

const KIND_ORDER: Record<CalendarEventKind, number> = {
  TASK: 0,
  ACHIEVEMENT: 1,
  REWARD: 2,
};

function validateMonth(year: number, monthIndex: number): void {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error('Calendar year must be an integer from 1000 through 9999.');
  }

  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new Error('Calendar monthIndex must be an integer from 0 through 11.');
  }
}

function compareEvents(left: CalendarEvent, right: CalendarEvent): number {
  const dateComparison = left.date.localeCompare(right.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  const kindComparison = KIND_ORDER[left.kind] - KIND_ORDER[right.kind];

  if (kindComparison !== 0) {
    return kindComparison;
  }

  const leftTime = parseTimestamp(left.occurredAt, 'Calendar event occurredAt').date.getTime();
  const rightTime = parseTimestamp(right.occurredAt, 'Calendar event occurredAt').date.getTime();

  return leftTime - rightTime || left.id.localeCompare(right.id);
}

export async function getCalendarEventsForMonth(
  year: number,
  monthIndex: number
): Promise<CalendarEvent[]> {
  validateMonth(year, monthIndex);

  const monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const nextMonthStart = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
  const startDate = getLocalDateKey(monthStart);
  const endDate = getLocalDateKey(nextMonthStart);
  const db = await initDatabase();

  try {
    const transactionRows = await db.getAllAsync<TransactionCalendarRow>(
      `SELECT
         coin_transactions.id,
         coin_transactions.type,
         coin_transactions.amount,
         coin_transactions.source_name,
         coin_transactions.task_id,
         coin_transactions.reward_id,
         coin_transactions.occurred_at,
         daily_logs.date AS daily_log_date
       FROM coin_transactions
       INNER JOIN daily_logs
         ON daily_logs.id = coin_transactions.daily_log_id
       WHERE daily_logs.date >= ?
         AND daily_logs.date < ?
         AND (
           (coin_transactions.type = ? AND coin_transactions.task_id IS NOT NULL)
           OR
           (coin_transactions.type = ? AND coin_transactions.reward_id IS NOT NULL)
         )
       ORDER BY daily_logs.date ASC, coin_transactions.occurred_at ASC, coin_transactions.id ASC`,
      [startDate, endDate, 'EARN', 'SPEND']
    );

    const achievementRows = await db.getAllAsync<AchievementCalendarRow>(
      `SELECT id, name, description, coin_bonus, achieved_at
       FROM achievements
       WHERE archived_at IS NULL
         AND julianday(achieved_at) >= julianday(?)
         AND julianday(achieved_at) < julianday(?)
       ORDER BY achieved_at ASC, id ASC`,
      [monthStart.toISOString(), nextMonthStart.toISOString()]
    );

    const transactionEvents: CalendarEvent[] = transactionRows.map((row) => ({
      id: `transaction:${row.id}`,
      kind: row.task_id !== null ? 'TASK' : 'REWARD',
      date: row.daily_log_date,
      name: row.source_name,
      amount: row.amount,
      description: null,
      occurredAt: row.occurred_at,
    }));

    const achievementEvents: CalendarEvent[] = achievementRows
      .map((row): CalendarEvent => {
        const achievedAt = parseTimestamp(row.achieved_at, 'Calendar Achievement achievedAt');

        return {
          id: `achievement:${row.id}`,
          kind: 'ACHIEVEMENT',
          date: getLocalDateKey(achievedAt.date),
          name: row.name,
          amount: row.coin_bonus,
          description: row.description.trim() || null,
          occurredAt: row.achieved_at,
        };
      })
      .filter((event) => event.date >= startDate && event.date < endDate);

    return [...transactionEvents, ...achievementEvents].sort(compareEvents);
  } finally {
    await db.closeAsync();
  }
}
