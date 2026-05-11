// Headless smoke test: imports the legacy MDB into a temp SQLite DB and prints a summary.
// Run with: npm run smoke:import
import path from 'node:path';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import Database from 'better-sqlite3';

import { initDatabase } from '../electron/db/schema';
import { importAccessFile } from '../electron/import/accessImporter';
import { MediaStore } from '../electron/media/mediaStore';
import { listClients, listMedia, listUnextractedMedia } from '../electron/db/queries';

const LEGACY_MDB =
  process.argv[2] ??
  path.resolve(__dirname, '../../../../2017+2018 Kata kenny & Gita Kata Tailor file.mdb');

async function main() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'shoplog-smoke-'));
  const dbPath = path.join(tmp, 'shoplog.db');
  const mediaDir = path.join(tmp, 'media');

  console.log(`[smoke] tmp dir: ${tmp}`);
  console.log(`[smoke] importing: ${LEGACY_MDB}`);

  const db = new Database(dbPath);
  initDatabase(db);
  const mediaStore = new MediaStore(mediaDir);
  await mediaStore.ensureReady();

  const summary = await importAccessFile(db, mediaStore, LEGACY_MDB);
  console.log('\n[smoke] Import summary:');
  console.log(JSON.stringify(summary, null, 2));

  const clients = listClients(db);
  console.log(`\n[smoke] DB now has ${clients.length} clients.`);

  const sample = clients.slice(0, 3).map((c) => ({
    id: c.id,
    legacy_id: c.legacy_id,
    name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
    order_no: c.order_no,
    chest: c.chest,
    waist: c.waist,
    media: listMedia(db, c.id as number).length,
  }));
  console.log('[smoke] Sample rows:');
  console.log(JSON.stringify(sample, null, 2));

  const unextracted = listUnextractedMedia(db);
  console.log(`\n[smoke] Unextracted media: ${unextracted.length}`);
  if (unextracted.length > 0) {
    console.log('[smoke] (will be retryable via Photo Recovery in-app)');
  }

  db.close();
  console.log(`\n[smoke] Done. Inspect: ${tmp}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
