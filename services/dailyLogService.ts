import type { SQLiteDatabase } from 'expo-sqlite';

import { initDatabase } from '@/database/database';
import type { DailyLog } from '@/models/types';

type DailyLogRow = {
  id: string;
  date: string;
  mental_exhaustion: number | null;
};

function mapDailyLogRow(row: DailyLogRow): DailyLog {
  return {
    id: row.id,
    date: row.date,
    mentalExhaustion: row.mental_exhaustion,
  };
}

function createId(): string {
  return `daily_log_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function validateDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('DailyLog date must use YYYY-MM-DD format.');
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new Error('DailyLog date must be a valid calendar date.');
  }

  return date;
}

function validateMentalExhaustion(mentalExhaustion: number | null): number | null {
  if (mentalExhaustion === null) {
    return null;
  }

  if (!Number.isInteger(mentalExhaustion) || mentalExhaustion < 0 || mentalExhaustion > 10) {
    throw new Error('DailyLog mentalExhaustion must be null or an integer from 0 through 10.');
  }

  return mentalExhaustion;
}

async function getDatabase(): Promise<SQLiteDatabase> {
  return initDatabase();
}

export async function getDailyLogByDate(date: string): Promise<DailyLog | null> {
  const validDate = validateDate(date);
  const db = await getDatabase();
  const row = await db.getFirstAsync<DailyLogRow>('SELECT * FROM daily_logs WHERE date = ?', [
    validDate,
  ]);

  return row ? mapDailyLogRow(row) : null;
}

export async function getOrCreateDailyLog(date: string): Promise<DailyLog> {
  const validDate = validateDate(date);
  const db = await getDatabase();
  const existingRow = await db.getFirstAsync<DailyLogRow>('SELECT * FROM daily_logs WHERE date = ?', [
    validDate,
  ]);

  if (existingRow) {
    return mapDailyLogRow(existingRow);
  }

  const id = createId();

  await db.runAsync('INSERT OR IGNORE INTO daily_logs (id, date, mental_exhaustion) VALUES (?, ?, ?)', [
    id,
    validDate,
    null,
  ]);

  const row = await db.getFirstAsync<DailyLogRow>('SELECT * FROM daily_logs WHERE date = ?', [
    validDate,
  ]);

  if (!row) {
    throw new Error('DailyLog could not be created.');
  }

  return mapDailyLogRow(row);
}

export async function updateMentalExhaustion(
  date: string,
  mentalExhaustion: number | null
): Promise<DailyLog> {
  const validDate = validateDate(date);
  const validMentalExhaustion = validateMentalExhaustion(mentalExhaustion);
  const dailyLog = await getOrCreateDailyLog(validDate);
  const db = await getDatabase();

  await db.runAsync('UPDATE daily_logs SET mental_exhaustion = ? WHERE id = ?', [
    validMentalExhaustion,
    dailyLog.id,
  ]);

  return {
    ...dailyLog,
    mentalExhaustion: validMentalExhaustion,
  };
}
