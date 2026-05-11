import { promises as fs } from 'node:fs';
import path from 'node:path';
import MDBReader from 'mdb-reader';
import type Database from 'better-sqlite3';

import { SIGNAL_KEYS, FIELDS } from '../../schema/canonical';
import {
  resolveFieldKey,
  resolvePhotoRole,
  splitName,
} from './fieldMap';
import { extractImageFromOle } from './oleExtractor';
import {
  upsertClient,
  attachMedia,
  findByLegacyId,
  findByOrderNo,
  type ClientRecord,
} from '../db/queries';
import type { MediaStore } from '../media/mediaStore';

export interface ImportSummary {
  filename: string;
  tablesScanned: string[];
  imported: number;
  updated: number;
  skipped: number;
  mediaExtracted: number;
  mediaFailed: number;
  warnings: string[];
}

const VALID_FIELD_KEYS = new Set(FIELDS.map((f) => f.key));

export async function importAccessFile(
  db: Database.Database,
  mediaStore: MediaStore,
  filePath: string,
): Promise<ImportSummary> {
  const buf = await fs.readFile(filePath);
  const reader = new MDBReader(buf);
  const tableNames = reader.getTableNames();
  const filename = path.basename(filePath);

  const summary: ImportSummary = {
    filename,
    tablesScanned: tableNames,
    imported: 0,
    updated: 0,
    skipped: 0,
    mediaExtracted: 0,
    mediaFailed: 0,
    warnings: [],
  };

  for (const tableName of tableNames) {
    let table;
    try {
      table = reader.getTable(tableName);
    } catch (err) {
      summary.warnings.push(`Could not open table "${tableName}": ${(err as Error).message}`);
      continue;
    }

    const cols = table.getColumnNames();
    const rows = table.getData() as Record<string, unknown>[];

    for (const row of rows) {
      try {
        await importRow({
          db,
          mediaStore,
          row,
          cols,
          filename,
          summary,
        });
      } catch (err) {
        summary.warnings.push(
          `Row failed: ${(err as Error).message}`,
        );
      }
    }
  }

  return summary;
}

async function importRow(args: {
  db: Database.Database;
  mediaStore: MediaStore;
  row: Record<string, unknown>;
  cols: string[];
  filename: string;
  summary: ImportSummary;
}): Promise<void> {
  const { db, mediaStore, row, cols, filename, summary } = args;

  // Build canonical record + collect any photo blobs.
  const record: ClientRecord = {};
  const photoBlobs: { role: string; blob: Buffer; sourceCol: string }[] = [];

  for (const col of cols) {
    const raw = row[col];

    if (col.toLowerCase() === 'id') {
      if (raw != null) record.legacy_id = String(raw);
      continue;
    }

    // Special case: legacy 2017 single "Name" field → split.
    if (col.toLowerCase() === 'name' && resolveFieldKey(col) === null) {
      const split = splitName(String(raw ?? ''));
      record.first_name = split.first_name;
      record.last_name = split.last_name;
      continue;
    }

    const photoRole = resolvePhotoRole(col);
    if (photoRole) {
      if (raw && Buffer.isBuffer(raw) && raw.length > 0) {
        photoBlobs.push({ role: photoRole, blob: raw, sourceCol: col });
      } else if (raw && raw instanceof Uint8Array && raw.length > 0) {
        photoBlobs.push({ role: photoRole, blob: Buffer.from(raw), sourceCol: col });
      }
      continue;
    }

    const key = resolveFieldKey(col);
    if (!key) {
      // Unknown column — log once.
      // (Don't spam: only warn the first time we see an unmapped column per import.)
      const warnTag = `unmapped:${col}`;
      if (!summary.warnings.includes(warnTag)) {
        summary.warnings.push(`Unmapped column ignored: "${col}"`);
      }
      continue;
    }

    if (!VALID_FIELD_KEYS.has(key)) continue;

    record[key] = stringifyCell(raw);
  }

  if (isEmptyRow(record)) {
    summary.skipped += 1;
    return;
  }

  record.imported_from = filename;

  // Dedupe: prefer order_no, fall back to legacy_id+filename.
  const existingByOrder =
    typeof record.order_no === 'string' && record.order_no
      ? findByOrderNo(db, record.order_no)
      : null;
  const existingByLegacy =
    !existingByOrder && record.legacy_id
      ? findByLegacyId(db, record.legacy_id, filename)
      : null;
  const existing = existingByOrder ?? existingByLegacy;

  if (existing?.id) record.id = existing.id;

  const id = upsertClient(db, record);
  if (existing) summary.updated += 1;
  else summary.imported += 1;

  // Media extraction for any photo blobs collected.
  for (const p of photoBlobs) {
    const result = extractImageFromOle(p.blob);
    if (result.ok && result.image) {
      const fname = await mediaStore.writeBytes(result.image.bytes, result.image.ext);
      attachMedia(db, {
        clientId: id,
        role: p.role,
        filename: fname,
        originalName: p.sourceCol,
        extracted: true,
      });
      summary.mediaExtracted += 1;
    } else {
      // Hard requirement: never lose a photo. Save raw blob for later recovery.
      const rawName = await mediaStore.writeBytes(p.blob, 'ole.bin');
      attachMedia(db, {
        clientId: id,
        role: p.role,
        filename: rawName,
        originalName: p.sourceCol,
        extracted: false,
        rawBlobFilename: rawName,
      });
      summary.mediaFailed += 1;
      summary.warnings.push(
        `OLE blob in "${p.sourceCol}" needs manual recovery (saved as ${rawName}): ${result.reason ?? 'unknown'}`,
      );
    }
  }
}

function stringifyCell(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Buffer.isBuffer(v)) return null; // not text
  return String(v);
}

function isEmptyRow(record: ClientRecord): boolean {
  for (const k of SIGNAL_KEYS) {
    const v = record[k];
    if (typeof v === 'string' && v.trim() !== '') return false;
  }
  return true;
}
