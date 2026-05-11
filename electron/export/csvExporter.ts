import { promises as fs } from 'node:fs';
import type Database from 'better-sqlite3';
import { columnKeys, FIELD_LABEL } from '../../schema/canonical';
import { listClients, listMedia } from '../db/queries';

export async function exportCsv(
  db: Database.Database,
  targetPath: string,
): Promise<{ rows: number }> {
  const cols = columnKeys();
  const allCols = ['id', ...cols, 'created_at', 'updated_at', 'imported_from', 'photos'];

  const header = allCols
    .map((c) => csvEscape(FIELD_LABEL[c] ?? humanize(c)))
    .join(',');

  const clients = listClients(db);
  const lines = [header];

  for (const c of clients) {
    const photos = listMedia(db, c.id as number)
      .map((m) => `${m.role}:${m.filename}`)
      .join('; ');

    const cells = allCols.map((col) => {
      if (col === 'photos') return csvEscape(photos);
      return csvEscape(c[col]);
    });
    lines.push(cells.join(','));
  }

  const csv = lines.join('\r\n') + '\r\n';
  await fs.writeFile(targetPath, csv, 'utf8');
  return { rows: clients.length };
}

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = typeof v === 'string' ? v : String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
