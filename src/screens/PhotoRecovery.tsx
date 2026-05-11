import React, { useEffect, useState } from 'react';
import { api, type MediaRow } from '../lib/ipc';

interface Props { onClose: () => void; }

export function PhotoRecovery({ onClose }: Props) {
  const [items, setItems] = useState<MediaRow[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);

  async function load() {
    const list = (await api().media.listUnextracted()) as MediaRow[];
    setItems(list);
  }

  useEffect(() => { void load(); }, []);

  async function retry(id: number) {
    setBusy(id);
    const result = await api().media.retryExtraction(id) as
      | { ok: true; filename: string }
      | { ok: false; reason: string };
    setLog((l) => [
      result.ok
        ? `✓ Recovered media #${id} → ${result.filename}`
        : `✗ Media #${id}: ${result.reason}`,
      ...l,
    ]);
    setBusy(null);
    await load();
  }

  async function openInExplorer(filename: string) {
    await api().media.openInExplorer(filename);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4">
        <header className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold">Photo Recovery</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Raw OLE photos that couldn't be auto-extracted on import.
              They're preserved in your media folder and can be retried or opened externally.
            </p>
          </div>
          <button onClick={onClose} className="btn">Close</button>
        </header>

        {items.length === 0 ? (
          <p className="text-sm text-emerald-700">
            All photos are extracted — nothing to recover.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Client</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">File</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2">#{m.client_id}</td>
                  <td className="px-3 py-2">{m.original_name ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{m.filename}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      onClick={() => openInExplorer(m.filename)}
                      className="btn"
                    >
                      Open folder
                    </button>
                    <button
                      onClick={() => retry(m.id)}
                      disabled={busy === m.id}
                      className="btn btn-primary"
                    >
                      {busy === m.id ? '…' : 'Retry'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {log.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm text-neutral-600">Activity log</summary>
            <ul className="text-xs bg-neutral-50 p-2 rounded mt-2 max-h-40 overflow-auto">
              {log.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
