import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.env.SESSION_DB_PATH || path.join(process.cwd(), 'data', 'sessions.db'));
const SESSION_TTL_MS = 60 * 60 * 1000; // 1시간

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    key TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    last_activity INTEGER NOT NULL
  )
`);

const stmtGet    = db.prepare('SELECT session_id, last_activity FROM sessions WHERE key = ?');
const stmtUpsert = db.prepare('INSERT INTO sessions (key, session_id, last_activity) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET session_id = excluded.session_id, last_activity = excluded.last_activity');
const stmtTouch  = db.prepare('UPDATE sessions SET last_activity = ? WHERE key = ?');
const stmtDelete = db.prepare('DELETE FROM sessions WHERE key = ?');
const stmtExpire = db.prepare('DELETE FROM sessions WHERE last_activity < ?');

export function getSession(key) {
  const row = stmtGet.get(key);
  if (!row) return null;

  if (Date.now() - row.last_activity > SESSION_TTL_MS) {
    stmtDelete.run(key);
    return null;
  }

  return row.session_id;
}

export function setSession(key, sessionId) {
  stmtUpsert.run(key, sessionId, Date.now());
}

export function touchSession(key) {
  stmtTouch.run(Date.now(), key);
}

export function deleteSession(key) {
  stmtDelete.run(key);
}

// 만료된 세션 주기적 정리 (10분마다)
setInterval(() => {
  stmtExpire.run(Date.now() - SESSION_TTL_MS);
}, 10 * 60 * 1000);
