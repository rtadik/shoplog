import type Database from 'better-sqlite3';
import { columnKeys } from '../../schema/canonical';

const SCHEMA_VERSION = 1;

export function initDatabase(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runSql(db, `
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const current = db
    .prepare('SELECT MAX(version) AS v FROM migrations')
    .get() as { v: number | null } | undefined;
  const at = current?.v ?? 0;

  if (at < 1) {
    runMigration1(db);
    db.prepare('INSERT INTO migrations (version, applied_at) VALUES (?, ?)').run(
      1,
      new Date().toISOString(),
    );
  }

  if (at > SCHEMA_VERSION) {
    throw new Error(
      `Database schema version (${at}) is newer than this app supports (${SCHEMA_VERSION}). Please update Shoplog.`,
    );
  }
}

function runSql(db: Database.Database, sql: string): void {
  db.exec(sql);
}

function runMigration1(db: Database.Database): void {
  const cols = columnKeys()
    .filter((k) => k !== 'legacy_id')
    .map((k) => `  "${k}" TEXT`)
    .join(',\n');

  runSql(db, `
    CREATE TABLE clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ${cols},
      legacy_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      imported_from TEXT
    );

    CREATE INDEX idx_clients_order_no ON clients(order_no);
    CREATE INDEX idx_clients_first_name ON clients(first_name);
    CREATE INDEX idx_clients_last_name ON clients(last_name);
    CREATE INDEX idx_clients_legacy_id ON clients(legacy_id);

    CREATE TABLE media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT,
      extracted INTEGER NOT NULL DEFAULT 1,
      raw_blob_filename TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX idx_media_client_id ON media(client_id);
  `);
}
