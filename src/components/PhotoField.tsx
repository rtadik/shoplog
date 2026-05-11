import React, { useEffect, useState } from 'react';
import { api, type MediaRow } from '../lib/ipc';

interface Props {
  clientId: number | null;
  role: string;
  label: string;
  /** Trigger reload when client saves. */
  reloadKey?: number;
}

export function PhotoField({ clientId, role, label, reloadKey }: Props) {
  const [items, setItems] = useState<MediaRow[]>([]);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [zoom, setZoom] = useState<string | null>(null);

  async function load() {
    if (!clientId) {
      setItems([]);
      return;
    }
    const list = (await api().media.list(clientId)) as MediaRow[];
    const filtered = list.filter((m) => m.role === role);
    setItems(filtered);

    const next: Record<number, string> = {};
    for (const m of filtered) {
      if (m.extracted) {
        next[m.id] = (await api().media.dataUrl(m.filename)) as string;
      }
    }
    setPreviews(next);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, reloadKey]);

  async function pickAndAdd() {
    if (!clientId) {
      alert('Save the client first, then add photos.');
      return;
    }
    const filePath = (await api().files.pickImage()) as string | null;
    if (!filePath) return;
    await api().media.add({ clientId, role, filePath });
    await load();
  }

  async function remove(id: number) {
    if (!confirm('Remove this photo?')) return;
    await api().media.delete(id);
    await load();
  }

  // Layout: 1 photo → full-width large; 2+ → 2-col grid still large.
  const gridCols = items.length <= 1 ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-neutral-700">{label}</span>
        <button onClick={pickAndAdd} className="btn">+ Add photo</button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-neutral-500">No photos yet.</p>
      ) : (
        <div className={`grid ${gridCols} gap-3`}>
          {items.map((m) => (
            <div key={m.id} className="relative group bg-neutral-50 rounded border">
              {m.extracted ? (
                <img
                  src={previews[m.id]}
                  alt={m.original_name ?? m.filename}
                  onClick={() => setZoom(previews[m.id] ?? null)}
                  className="w-full max-h-[500px] object-contain rounded cursor-zoom-in"
                />
              ) : (
                <div className="w-full h-48 rounded border border-amber-300 bg-amber-50 flex items-center justify-center text-amber-800 text-sm px-2 text-center">
                  Raw OLE — needs recovery
                </div>
              )}
              <button
                onClick={() => remove(m.id)}
                className="absolute top-2 right-2 bg-white/95 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition btn-danger shadow"
                title="Delete photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center cursor-zoom-out p-8"
          onClick={() => setZoom(null)}
        >
          <img
            src={zoom}
            alt="zoomed"
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(null);
            }}
            className="absolute top-4 right-4 bg-white rounded-full w-10 h-10 text-xl font-bold shadow"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
