// Your accounts on disk: one SQLite file at data/books.db.
// Each business is saved whole, so a save can never leave half an entry behind,
// and the state before the first save of each day is kept as an automatic restore point.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = process.env.BOOKS_DATA_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
export const DB_PATH = path.join(DATA_DIR, 'books.db');
const RESTORE_POINTS_KEPT = 30;

let db;

function open() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS restore_points (
      company_id TEXT NOT NULL,
      day TEXT NOT NULL,
      taken_at TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (company_id, day)
    );
  `);
  return db;
}

export function listCompanies() {
  return open().prepare('SELECT id, name, updated_at AS updatedAt FROM companies ORDER BY name').all().map(r => ({ ...r }));
}

export function getActiveId() {
  return open().prepare("SELECT value FROM settings WHERE key = 'active'").get()?.value ?? null;
}

export function setActiveId(id) {
  open().prepare("INSERT INTO settings (key, value) VALUES ('active', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(id);
}

export function getCompany(id) {
  const row = open().prepare('SELECT data FROM companies WHERE id = ?').get(id);
  return row ? row.data : null;
}

export function saveCompany(id, name, json) {
  const conn = open();
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  conn.exec('BEGIN');
  try {
    const existing = conn.prepare('SELECT data FROM companies WHERE id = ?').get(id);
    if (existing && existing.data !== json) {
      conn.prepare('INSERT OR IGNORE INTO restore_points (company_id, day, taken_at, data) VALUES (?, ?, ?, ?)').run(id, day, now, existing.data);
      conn.prepare(`
        DELETE FROM restore_points WHERE company_id = ? AND day NOT IN (
          SELECT day FROM restore_points WHERE company_id = ? ORDER BY day DESC LIMIT ?
        )
      `).run(id, id, RESTORE_POINTS_KEPT);
    }
    conn.prepare(`
      INSERT INTO companies (id, name, data, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, data = excluded.data, updated_at = excluded.updated_at
    `).run(id, name, json, now);
    conn.exec('COMMIT');
  } catch (err) {
    conn.exec('ROLLBACK');
    throw err;
  }
  return now;
}

export function deleteCompany(id) {
  const conn = open();
  conn.prepare('DELETE FROM companies WHERE id = ?').run(id);
  conn.prepare('DELETE FROM restore_points WHERE company_id = ?').run(id);
  if (getActiveId() === id) conn.prepare("DELETE FROM settings WHERE key = 'active'").run();
}

export function listRestorePoints(id) {
  return open()
    .prepare('SELECT day, taken_at AS takenAt, length(data) AS size FROM restore_points WHERE company_id = ? ORDER BY day DESC')
    .all(id).map(r => ({ ...r }));
}

export function getRestorePoint(id, day) {
  const row = open().prepare('SELECT data FROM restore_points WHERE company_id = ? AND day = ?').get(id, day);
  return row ? row.data : null;
}

export function storageInfo() {
  open();
  const size = fs.statSync(DB_PATH).size;
  return { path: DB_PATH, sizeKb: Math.round(size / 1024) };
}
