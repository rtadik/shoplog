import type Database from 'better-sqlite3';
import { columnKeys } from '../../schema/canonical';

export interface ClientRecord {
  id?: number;
  legacy_id?: string | null;
  created_at?: string;
  updated_at?: string;
  imported_from?: string | null;
  [key: string]: unknown;
}

export interface MediaRecord {
  id: number;
  client_id: number;
  role: string;
  filename: string;
  original_name: string | null;
  extracted: number;
  raw_blob_filename: string | null;
  created_at: string;
}

const ALL_COLS = [...columnKeys(), 'created_at', 'updated_at', 'imported_from'];

export function listClients(
  db: Database.Database,
  filter?: string,
): ClientRecord[] {
  const baseSql = `SELECT id, ${ALL_COLS.map((c) => `"${c}"`).join(', ')} FROM clients`;
  if (!filter || !filter.trim()) {
    return db.prepare(`${baseSql} ORDER BY COALESCE(date, '') DESC, id DESC`).all() as ClientRecord[];
  }

  const like = `%${filter.trim().toLowerCase()}%`;
  const sql = `
    ${baseSql}
    WHERE LOWER(COALESCE(first_name, '')) LIKE ?
       OR LOWER(COALESCE(last_name, '')) LIKE ?
       OR LOWER(COALESCE(order_no, '')) LIKE ?
       OR LOWER(COALESCE(phone, '')) LIKE ?
       OR LOWER(COALESCE(email, '')) LIKE ?
       OR LOWER(COALESCE(country, '')) LIKE ?
       OR LOWER(COALESCE(code, '')) LIKE ?
    ORDER BY COALESCE(date, '') DESC, id DESC
  `;
  return db.prepare(sql).all(like, like, like, like, like, like, like) as ClientRecord[];
}

export function getClient(db: Database.Database, id: number): ClientRecord | null {
  const row = db
    .prepare(`SELECT id, ${ALL_COLS.map((c) => `"${c}"`).join(', ')} FROM clients WHERE id = ?`)
    .get(id) as ClientRecord | undefined;
  return row ?? null;
}

export function upsertClient(
  db: Database.Database,
  record: ClientRecord,
): number {
  const now = new Date().toISOString();
  const cols = [...columnKeys(), 'legacy_id', 'imported_from'];

  if (record.id) {
    const setClause = cols.map((c) => `"${c}" = @${c}`).join(', ');
    const params: Record<string, unknown> = { id: record.id, updated_at: now };
    for (const c of cols) params[c] = record[c] ?? null;
    db.prepare(
      `UPDATE clients SET ${setClause}, updated_at = @updated_at WHERE id = @id`,
    ).run(params);
    return record.id;
  }

  const insertCols = ['created_at', 'updated_at', ...cols];
  const placeholders = insertCols.map((c) => `@${c}`).join(', ');
  const params: Record<string, unknown> = { created_at: now, updated_at: now };
  for (const c of cols) params[c] = record[c] ?? null;
  const info = db
    .prepare(
      `INSERT INTO clients (${insertCols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
    )
    .run(params);
  return Number(info.lastInsertRowid);
}

export function deleteClient(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
}

export function findByOrderNo(
  db: Database.Database,
  orderNo: string,
): ClientRecord | null {
  if (!orderNo) return null;
  const row = db
    .prepare(`SELECT id FROM clients WHERE order_no = ? LIMIT 1`)
    .get(orderNo) as ClientRecord | undefined;
  return row ?? null;
}

export function findByLegacyId(
  db: Database.Database,
  legacyId: string,
  importedFrom: string,
): ClientRecord | null {
  const row = db
    .prepare(`SELECT id FROM clients WHERE legacy_id = ? AND imported_from = ? LIMIT 1`)
    .get(legacyId, importedFrom) as ClientRecord | undefined;
  return row ?? null;
}

export function attachMedia(
  db: Database.Database,
  args: {
    clientId: number;
    role: string;
    filename: string;
    originalName?: string | null;
    extracted: boolean;
    rawBlobFilename?: string | null;
  },
): number {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO media (client_id, role, filename, original_name, extracted, raw_blob_filename, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      args.clientId,
      args.role,
      args.filename,
      args.originalName ?? null,
      args.extracted ? 1 : 0,
      args.rawBlobFilename ?? null,
      now,
    );
  return Number(info.lastInsertRowid);
}

export function listMedia(db: Database.Database, clientId: number): MediaRecord[] {
  return db
    .prepare(`SELECT * FROM media WHERE client_id = ? ORDER BY id`)
    .all(clientId) as MediaRecord[];
}

export function deleteMedia(db: Database.Database, id: number): MediaRecord | null {
  const m = db.prepare('SELECT * FROM media WHERE id = ?').get(id) as MediaRecord | undefined;
  db.prepare('DELETE FROM media WHERE id = ?').run(id);
  return m ?? null;
}

export function listUnextractedMedia(db: Database.Database): MediaRecord[] {
  return db
    .prepare('SELECT * FROM media WHERE extracted = 0 ORDER BY id')
    .all() as MediaRecord[];
}

export function markMediaExtracted(
  db: Database.Database,
  id: number,
  newFilename: string,
): void {
  db.prepare(
    'UPDATE media SET extracted = 1, filename = ?, raw_blob_filename = NULL WHERE id = ?',
  ).run(newFilename, id);
}
