/**
 * database.js
 * Thin adapter — re-exports the shared SQLite instance.
 * Import { getDatabase } from './database' in any db module.
 */
import * as SQLite from 'expo-sqlite';

let _db = null;

export async function getDatabase() {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('tattoo_aftercare.db');
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync('PRAGMA foreign_keys = ON;');
  return _db;
}
