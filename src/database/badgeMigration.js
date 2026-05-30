import { getDB } from './socialDb';

let ran = false;

export async function migrateBadgeUniqueness() {
  if (ran) return;
  ran = true;

  const db = await getDB();
  try {
    const info = await db.getAllAsync('PRAGMA table_info(user_badges)');
    if (!info || info.length === 0) return;

    await db.execAsync('BEGIN TRANSACTION;');
    try {
      await db.execAsync('CREATE TABLE IF NOT EXISTS user_badges_next (id TEXT, user_id TEXT, badge_type TEXT NOT NULL, earned_at TEXT DEFAULT (datetime(\'now\')), UNIQUE(user_id, badge_type));');
      await db.execAsync('INSERT OR IGNORE INTO user_badges_next (id, user_id, badge_type, earned_at) SELECT id, user_id, badge_type, earned_at FROM user_badges;');
      await db.execAsync('DROP TABLE user_badges;');
      await db.execAsync('ALTER TABLE user_badges_next RENAME TO user_badges;');
      await db.execAsync('COMMIT;');
    } catch (innerErr) {
      await db.execAsync('ROLLBACK;');
      throw innerErr;
    }
  } catch (e) {
    console.warn('Badge migration skipped:', e?.message || e);
  }
}
