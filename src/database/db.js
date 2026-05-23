import * as SQLite from 'expo-sqlite';
import { format, subDays, isToday, parseISO } from 'date-fns';

let db = null;

export async function getDB() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('tattoo_aftercare.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
  return db;
}

export async function initDB() {
  const database = await getDB();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS tattoos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      placement TEXT,
      artist_name TEXT,
      artist_instagram TEXT,
      shop_name TEXT,
      style TEXT,
      date_tattooed TEXT NOT NULL,
      notes TEXT,
      pain_rating INTEGER,
      personal_rating INTEGER,
      thumbnail_uri TEXT,
      is_pro_unlocked INTEGER DEFAULT 0,
      touchup_reminder_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS care_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tattoo_id INTEGER NOT NULL,
      log_date TEXT NOT NULL,
      washed INTEGER DEFAULT 0,
      moisturized INTEGER DEFAULT 0,
      peeling INTEGER DEFAULT 0,
      itching INTEGER DEFAULT 0,
      redness INTEGER DEFAULT 0,
      swelling INTEGER DEFAULT 0,
      discharge INTEGER DEFAULT 0,
      fever INTEGER DEFAULT 0,
      notes TEXT,
      health_status TEXT DEFAULT 'good',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tattoo_id) REFERENCES tattoos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tattoo_id INTEGER NOT NULL,
      uri TEXT NOT NULL,
      taken_date TEXT NOT NULL,
      day_number INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tattoo_id) REFERENCES tattoos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

export async function getTattoos() {
  const database = await getDB();
  return await database.getAllAsync(
    'SELECT * FROM tattoos ORDER BY created_at DESC'
  );
}

export async function getTattooById(id) {
  const database = await getDB();
  return await database.getFirstAsync('SELECT * FROM tattoos WHERE id = ?', [id]);
}

export async function addTattoo(data) {
  const database = await getDB();
  const result = await database.runAsync(
    `INSERT INTO tattoos (name, placement, artist_name, artist_instagram, shop_name, style, date_tattooed, notes, pain_rating, personal_rating, thumbnail_uri, is_pro_unlocked, touchup_reminder_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.placement || null,
      data.artist_name || null,
      data.artist_instagram || null,
      data.shop_name || null,
      data.style || null,
      data.date_tattooed,
      data.notes || null,
      data.pain_rating || null,
      data.personal_rating || null,
      data.thumbnail_uri || null,
      data.is_pro_unlocked ? 1 : 0,
      data.touchup_reminder_enabled ? 1 : 0,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateTattoo(id, data) {
  const database = await getDB();
  await database.runAsync(
    `UPDATE tattoos SET
      name = ?,
      placement = ?,
      artist_name = ?,
      artist_instagram = ?,
      shop_name = ?,
      style = ?,
      date_tattooed = ?,
      notes = ?,
      pain_rating = ?,
      personal_rating = ?,
      thumbnail_uri = ?,
      is_pro_unlocked = ?,
      touchup_reminder_enabled = ?
     WHERE id = ?`,
    [
      data.name,
      data.placement || null,
      data.artist_name || null,
      data.artist_instagram || null,
      data.shop_name || null,
      data.style || null,
      data.date_tattooed,
      data.notes || null,
      data.pain_rating || null,
      data.personal_rating || null,
      data.thumbnail_uri || null,
      data.is_pro_unlocked ? 1 : 0,
      data.touchup_reminder_enabled ? 1 : 0,
      id,
    ]
  );
}

export async function deleteTattoo(id) {
  const database = await getDB();
  await database.runAsync('DELETE FROM tattoos WHERE id = ?', [id]);
}

export async function getCareLogsForTattoo(tattooId) {
  const database = await getDB();
  return await database.getAllAsync(
    'SELECT * FROM care_logs WHERE tattoo_id = ? ORDER BY log_date DESC',
    [tattooId]
  );
}

export async function getCareLogForDate(tattooId, date) {
  const database = await getDB();
  return await database.getFirstAsync(
    'SELECT * FROM care_logs WHERE tattoo_id = ? AND log_date = ?',
    [tattooId, date]
  );
}

export async function addCareLog(data) {
  const database = await getDB();
  const result = await database.runAsync(
    `INSERT INTO care_logs (tattoo_id, log_date, washed, moisturized, peeling, itching, redness, swelling, discharge, fever, notes, health_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.tattoo_id,
      data.log_date,
      data.washed ? 1 : 0,
      data.moisturized ? 1 : 0,
      data.peeling ? 1 : 0,
      data.itching ? 1 : 0,
      data.redness ? 1 : 0,
      data.swelling ? 1 : 0,
      data.discharge ? 1 : 0,
      data.fever ? 1 : 0,
      data.notes || null,
      data.health_status || 'good',
    ]
  );
  return result.lastInsertRowId;
}

export async function updateCareLog(id, data) {
  const database = await getDB();
  await database.runAsync(
    `UPDATE care_logs SET
      washed = ?,
      moisturized = ?,
      peeling = ?,
      itching = ?,
      redness = ?,
      swelling = ?,
      discharge = ?,
      fever = ?,
      notes = ?,
      health_status = ?
     WHERE id = ?`,
    [
      data.washed ? 1 : 0,
      data.moisturized ? 1 : 0,
      data.peeling ? 1 : 0,
      data.itching ? 1 : 0,
      data.redness ? 1 : 0,
      data.swelling ? 1 : 0,
      data.discharge ? 1 : 0,
      data.fever ? 1 : 0,
      data.notes || null,
      data.health_status || 'good',
      id,
    ]
  );
}

export async function getPhotosForTattoo(tattooId) {
  const database = await getDB();
  return await database.getAllAsync(
    'SELECT * FROM photos WHERE tattoo_id = ? ORDER BY day_number ASC',
    [tattooId]
  );
}

export async function addPhoto(data) {
  const database = await getDB();
  const result = await database.runAsync(
    'INSERT INTO photos (tattoo_id, uri, taken_date, day_number) VALUES (?, ?, ?, ?)',
    [data.tattoo_id, data.uri, data.taken_date, data.day_number || null]
  );
  return result.lastInsertRowId;
}

export async function deletePhoto(id) {
  const database = await getDB();
  await database.runAsync('DELETE FROM photos WHERE id = ?', [id]);
}

export async function getSetting(key) {
  const database = await getDB();
  const row = await database.getFirstAsync(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row ? row.value : null;
}

export async function setSetting(key, value) {
  const database = await getDB();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, String(value)]
  );
}

export async function getStreak() {
  const database = await getDB();
  const today = format(new Date(), 'yyyy-MM-dd');
  let streak = 0;
  let currentDate = today;

  // Safety cap: never walk back more than 365 days to prevent infinite loop
  const MAX_STREAK_DAYS = 365;
  let safety = 0;

  while (safety < MAX_STREAK_DAYS) {
    safety++;

    const row = await database.getFirstAsync(
      `SELECT COUNT(*) as cnt FROM care_logs
       WHERE log_date = ? AND (washed = 1 OR moisturized = 1)`,
      [currentDate]
    );

    if (!row || row.cnt === 0) {
      // If checking today and no log yet, allow streak to continue from yesterday
      if (currentDate === today && streak === 0) {
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const yesterdayRow = await database.getFirstAsync(
          `SELECT COUNT(*) as cnt FROM care_logs
           WHERE log_date = ? AND (washed = 1 OR moisturized = 1)`,
          [yesterday]
        );
        if (!yesterdayRow || yesterdayRow.cnt === 0) {
          break;
        }
        currentDate = yesterday;
        continue;
      }
      break;
    }

    streak++;
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    currentDate = format(prevDate, 'yyyy-MM-dd');
  }

  return streak;
}
