# Shoplog

A simple desktop app to manage shop client records. Runs fully offline on Windows. Replaces Microsoft Access — imports your existing `.mdb` / `.accdb` files so no data is lost.

---

## Download & Install (Windows)

### Option 1 — Direct download (easiest)

1. Go to the [latest release page](https://github.com/rtadik/shoplog/releases/latest).
2. Under **Assets**, click **`Shoplog-Setup-0.1.0.exe`** to download it.
3. Double-click the downloaded file.
4. Windows will show **"Windows protected your PC."** This is normal — the app isn't code-signed. Click **More info** → **Run anyway**.
5. The installer runs and adds a **Shoplog** shortcut to your desktop.
6. Double-click the shortcut. You're in.

### Option 2 — One-line install (PowerShell)

Press **Start**, type `powershell`, hit **Enter**, then paste:

```powershell
irm https://github.com/rtadik/shoplog/releases/latest/download/Shoplog-Setup-0.1.0.exe -OutFile $env:TEMP\Shoplog.exe; Start-Process $env:TEMP\Shoplog.exe
```

That downloads and launches the installer in one step. (Still need to click "More info → Run anyway" on the SmartScreen warning the first time.)

---

## Using the app

1. **Double-click the Shoplog shortcut** on the desktop.
2. The **Client List** appears. Type in the search box to filter by name / phone / anything.
3. **Add a client:** click **+ Add Client**, fill in the form, click **Save**.
4. **Edit a client:** click any row in the list, change what you need, **Save**.
5. **Attach photos:** in the client form, scroll to the **Photos** section → **+ Add photo**.
6. **Import old Access data:** click **Import…** in the top-right → pick your `.mdb` or `.accdb` file → wait for the summary.
7. **Back up to spreadsheet:** click **Export CSV** → opens in Excel.
8. **Recover photos that didn't import cleanly:** click **Photo Recovery** in the toolbar.

### Where your data lives

- Database: `%APPDATA%\Shoplog\shoplog.db`
- Photos: `%APPDATA%\Shoplog\media\`

Back these up to a USB stick or Drive periodically — that's everything.

---

## Updates

When a new version is released, download the new `.exe` from the [releases page](https://github.com/rtadik/shoplog/releases) and run it. Your data is preserved automatically (stored separately from the app).

---

## For developers

### Run in dev mode (Mac or Windows)

```bash
cd app
npm install
npm run rebuild   # rebuild better-sqlite3 against Electron's Node
npm run dev
```

### Build the Windows installer

On Windows:
```bash
npm run package:win
```

On macOS (via Docker, since Wine on Apple Silicon is unreliable):
```bash
docker run --rm -v "$PWD":/project -w /project electronuserland/builder:wine \
  bash -lc "npm ci && npm run package:win"
```

Output: `release/Shoplog-Setup-<version>.exe`.

### Headless import smoke test

```bash
npm run smoke:import
```

Imports the bundled legacy `.mdb` into a temp SQLite DB and prints a record/photo summary.

### Project layout

- `electron/` — main process: DB, IPC handlers, Access import, OLE extractor, CSV export, media store
- `src/` — renderer (React UI): Client List, Client Form, Photo Recovery
- `schema/canonical.ts` — single source of truth for fields (drives DB schema, form, CSV)

### Renaming the app (for other shops)

Three edits, no other branding in code:
1. `package.json` → `name`, `productName` under `build`
2. `electron/main.ts` → `BrowserWindow` `title`
3. `src/screens/ClientList.tsx` → header `<h1>` text

### Cutting a new release

```bash
# 1. Bump version in package.json
# 2. Build:
npm run package:win   # or Docker command above
# 3. Publish:
gh release create v0.2.0 release/Shoplog-Setup-0.2.0.exe \
  --title "Shoplog v0.2.0" --notes "What changed..."
```

---

## License

Private — see repo owner.
