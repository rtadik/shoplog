# Shoplog

Local-first desktop app to manage tailor / shop client records, with Microsoft Access import.

## Quick start (dev)

```bash
cd projects/mc-access-duplicate/app
npm install
npm run rebuild   # rebuild better-sqlite3 against Electron's Node version
npm run dev
```

The app opens in an Electron window. Database lives at `~/Library/Application Support/Shoplog/shoplog.db` (Mac) or `%APPDATA%/Shoplog/shoplog.db` (Windows).

## Building for Windows

```bash
npm run package:win
```

Output: `release/Shoplog-Setup-<version>.exe`. The NSIS installer creates a desktop shortcut and a Start Menu entry. Cross-compiling from Mac requires Wine; otherwise build on a Windows machine.

## Smoke test (no Electron)

```bash
npm run smoke:import
```

Imports the legacy `2017+2018 Kata kenny & Gita Kata Tailor file.mdb` into a temp SQLite DB and prints a summary. Useful for verifying the importer + OLE extractor without launching the full app.

## Layout

- `electron/` — main process (Node-side): DB, IPC handlers, Access import, OLE extractor, CSV export, media store
- `src/` — renderer (React UI): Client List, Client Form, Photo Recovery
- `schema/canonical.ts` — single source of truth for fields (drives DB DDL, form, CSV)

## Importing your Access file

1. Click **Import…** in the Client List header
2. Pick a `.accdb` or `.mdb` file
3. Watch the summary modal: it reports how many records were imported / updated / skipped, and how many photos were extracted vs need manual recovery
4. Any photos that couldn't be auto-extracted are saved as raw OLE blobs and listed in **Photo Recovery** (button in the header), where you can retry extraction or open the file in Explorer/Finder

## Renaming the app (later)

Three places:
1. `package.json` → `name`, `productName` under `build`
2. `electron/main.ts` → `BrowserWindow` `title`
3. `src/screens/ClientList.tsx` → header `<h1>` text

That's it — no other tailor- or Shoplog-specific terminology in code.

## How dad uses it

1. Click the Shoplog desktop shortcut.
2. The Client List appears. Type in the search box to filter, or click **+ Add Client**.
3. Fill in the form (sections collapse/expand). Click **Save**.
4. Photos: click **+ Add photo** in the Photos section to attach images.
5. To bring in old Access data, click **Import…** at the top right.
6. To back up: click **Export CSV** — opens in Excel.
