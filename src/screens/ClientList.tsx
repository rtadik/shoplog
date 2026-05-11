import React, { useState } from 'react';
import { useClientList } from '../state/clients';
import { api, type ImportSummary } from '../lib/ipc';
import { ClientForm } from './ClientForm';
import { PhotoRecovery } from './PhotoRecovery';

export function ClientList() {
  const { clients, filter, setFilter, loading, refresh } = useClientList();
  const [editing, setEditing] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  async function importFile() {
    const result = (await api().importer.pickAndImport()) as ImportSummary | null;
    if (result) {
      setImportSummary(result);
      await refresh();
    }
  }

  async function exportCsv() {
    const result = (await api().exporter.csv()) as { path: string; rows: number } | null;
    if (result) {
      alert(`Exported ${result.rows} rows to:\n${result.path}`);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 border-b bg-white flex items-center gap-3">
        <h1 className="text-xl font-bold">Shoplog</h1>
        <span className="text-sm text-neutral-500">
          {clients.length} client{clients.length === 1 ? '' : 's'}
        </span>
        <input
          type="text"
          placeholder="Search name, order no, phone, email…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="ml-4 max-w-md"
        />
        <div className="ml-auto flex gap-2">
          <button onClick={() => setCreating(true)} className="btn btn-primary">
            + Add Client
          </button>
          <button onClick={importFile} className="btn">Import…</button>
          <button onClick={exportCsv} className="btn">Export CSV</button>
          <button onClick={() => setShowRecovery(true)} className="btn">Photo Recovery</button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        {loading ? (
          <p className="text-neutral-500">Loading…</p>
        ) : clients.length === 0 ? (
          <EmptyState onAdd={() => setCreating(true)} onImport={importFile} />
        ) : (
          <div className="bg-white rounded shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-600">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Order #</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Country</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setEditing(c.id as number)}
                    className="border-t hover:bg-blue-50 cursor-pointer"
                  >
                    <td className="px-4 py-2">{(c.date as string) ?? ''}</td>
                    <td className="px-4 py-2 font-mono">{(c.order_no as string) ?? ''}</td>
                    <td className="px-4 py-2 font-medium">
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-2">{(c.country as string) ?? ''}</td>
                    <td className="px-4 py-2">{(c.phone as string) ?? ''}</td>
                    <td className="px-4 py-2 text-right">{(c.total_amount as string) ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {(editing != null || creating) && (
        <ClientForm
          clientId={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
            void refresh();
          }}
          onSaved={(id) => {
            setEditing(id);
            setCreating(false);
            void refresh();
          }}
        />
      )}

      {importSummary && (
        <ImportSummaryModal
          summary={importSummary}
          onClose={() => setImportSummary(null)}
        />
      )}

      {showRecovery && (
        <PhotoRecovery onClose={() => {
          setShowRecovery(false);
          void refresh();
        }} />
      )}
    </div>
  );
}

function EmptyState({ onAdd, onImport }: { onAdd: () => void; onImport: () => void }) {
  return (
    <div className="text-center py-20">
      <h2 className="text-xl font-semibold text-neutral-700">No clients yet</h2>
      <p className="text-neutral-500 mt-2">Add your first client, or import an Access file.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={onAdd} className="btn btn-primary">+ Add Client</button>
        <button onClick={onImport} className="btn">Import from Access…</button>
      </div>
    </div>
  );
}

function ImportSummaryModal({
  summary,
  onClose,
}: {
  summary: ImportSummary;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-3">
        <h2 className="text-lg font-semibold">Import complete</h2>
        <p className="text-sm text-neutral-600">From: {summary.filename}</p>
        <ul className="text-sm space-y-1">
          <li><b>{summary.imported}</b> new records</li>
          <li><b>{summary.updated}</b> updated</li>
          <li><b>{summary.skipped}</b> empty rows skipped</li>
          <li><b>{summary.mediaExtracted}</b> photos extracted</li>
          <li>
            <b>{summary.mediaFailed}</b> photos saved as raw OLE
            {summary.mediaFailed > 0 && ' — open Photo Recovery to retry'}
          </li>
        </ul>
        {summary.warnings.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-neutral-600">
              {summary.warnings.length} warnings
            </summary>
            <ul className="mt-2 max-h-40 overflow-auto bg-neutral-50 p-2 rounded">
              {summary.warnings.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </details>
        )}
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn btn-primary">OK</button>
        </div>
      </div>
    </div>
  );
}
