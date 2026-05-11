import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

import { initDatabase } from './db/schema';
import {
  listClients,
  getClient,
  upsertClient,
  deleteClient,
  attachMedia,
  listMedia,
  deleteMedia as dbDeleteMedia,
  listUnextractedMedia,
  markMediaExtracted,
  type ClientRecord,
} from './db/queries';
import { importAccessFile } from './import/accessImporter';
import { exportCsv } from './export/csvExporter';
import { MediaStore } from './media/mediaStore';
import { extractImageFromOle } from './import/oleExtractor';

const __dirname_ = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;
let mediaStore: MediaStore | null = null;

function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}
function getMedia(): MediaStore {
  if (!mediaStore) throw new Error('Media store not initialized');
  return mediaStore;
}

async function initStorage(): Promise<void> {
  const userData = app.getPath('userData');
  await fs.mkdir(userData, { recursive: true });
  const dbPath = path.join(userData, 'shoplog.db');
  db = new Database(dbPath);
  initDatabase(db);

  const mediaDir = path.join(userData, 'media');
  mediaStore = new MediaStore(mediaDir);
  await mediaStore.ensureReady();
}

function createWindow(): void {
  const preloadPath = path.join(__dirname_, '../preload/preload.js');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Shoplog',
    backgroundColor: '#fafaf7',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname_, '../renderer/index.html'));
  }
}

function registerIpc(): void {
  ipcMain.handle('clients:list', (_e, filter?: string) =>
    listClients(getDb(), filter),
  );

  ipcMain.handle('clients:get', (_e, id: number) => {
    const client = getClient(getDb(), id);
    if (!client) return null;
    const media = listMedia(getDb(), id);
    return { ...client, media };
  });

  ipcMain.handle('clients:save', (_e, record: ClientRecord) =>
    upsertClient(getDb(), record),
  );

  ipcMain.handle('clients:delete', (_e, id: number) => {
    deleteClient(getDb(), id);
    return true;
  });

  ipcMain.handle('media:list', (_e, clientId: number) =>
    listMedia(getDb(), clientId),
  );

  ipcMain.handle('media:add', async (_e, args: { clientId: number; role: string; filePath: string }) => {
    const { filename, originalName } = await getMedia().copyIn(args.filePath);
    const id = attachMedia(getDb(), {
      clientId: args.clientId,
      role: args.role,
      filename,
      originalName,
      extracted: true,
    });
    return { id, filename };
  });

  ipcMain.handle('media:delete', (_e, id: number) => {
    const m = dbDeleteMedia(getDb(), id);
    if (m) void getMedia().remove(m.filename);
    return true;
  });

  ipcMain.handle('media:dataUrl', async (_e, filename: string) => {
    const bytes = await getMedia().readBytes(filename);
    const ext = path.extname(filename).slice(1).toLowerCase();
    const mime =
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'png' ? 'image/png'
      : ext === 'gif' ? 'image/gif'
      : ext === 'bmp' ? 'image/bmp'
      : 'application/octet-stream';
    return `data:${mime};base64,${bytes.toString('base64')}`;
  });

  ipcMain.handle('media:openInExplorer', async (_e, filename: string) => {
    shell.showItemInFolder(getMedia().fullPath(filename));
    return true;
  });

  ipcMain.handle('media:listUnextracted', () => listUnextractedMedia(getDb()));

  ipcMain.handle('media:retryExtraction', async (_e, id: number) => {
    const all = listUnextractedMedia(getDb());
    const m = all.find((x) => x.id === id);
    if (!m) return { ok: false, reason: 'not found' };
    const bytes = await getMedia().readBytes(m.filename);
    const result = extractImageFromOle(bytes);
    if (result.ok && result.image) {
      const newName = await getMedia().writeBytes(result.image.bytes, result.image.ext);
      markMediaExtracted(getDb(), id, newName);
      return { ok: true, filename: newName };
    }
    return { ok: false, reason: result.reason ?? 'unknown' };
  });

  ipcMain.handle('import:pickAndImport', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Choose an Access file to import',
      filters: [
        { name: 'Access Database', extensions: ['accdb', 'mdb'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return importAccessFile(getDb(), getMedia(), result.filePaths[0]);
  });

  ipcMain.handle('export:csv', async () => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export clients to CSV',
      defaultPath: `shoplog-export-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (result.canceled || !result.filePath) return null;
    const out = await exportCsv(getDb(), result.filePath);
    return { path: result.filePath, ...out };
  });

  ipcMain.handle('files:pickImage', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Choose a photo',
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });
}

app.whenReady().then(async () => {
  await initStorage();
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  db?.close();
});
