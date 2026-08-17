import * as SQLite from 'expo-sqlite';

import { createAllTables } from './schema';

export async function initDatabase() {
  const db = await SQLite.openDatabaseAsync('goodiejar.db');

  // Improve SQLite performance for the app
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  // Create all tables if they do not already exist
  await db.execAsync(createAllTables);

  return db;
}