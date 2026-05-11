import React, { useEffect, useState } from 'react';
import { FIELDS, GROUP_ORDER, type FieldGroup } from '../../schema/canonical';
import { api } from '../lib/ipc';
import { MeasurementInput } from '../components/MeasurementInput';
import { PhotoField } from '../components/PhotoField';

interface Props {
  clientId: number | null;
  onClose: () => void;
  onSaved: (id: number) => void;
}

const SECTION_DESC: Record<FieldGroup, string> = {
  Order: 'Date, order number, and pricing',
  Contact: 'Name, address, contact info',
  Body: 'Body measurements',
  Garment: 'Garment lengths',
  Trouser: 'Trouser-specific measurements',
  Photos: 'Customer / fabric photos',
  Legacy: 'Older fields preserved from imports',
};

export function ClientForm({ clientId, onClose, onSaved }: Props) {
  const [record, setRecord] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Record<FieldGroup, boolean>>({
    Order: true,
    Contact: true,
    Body: true,
    Garment: true,
    Trouser: true,
    Photos: true,
    Legacy: false,
  });
  const [savedId, setSavedId] = useState<number | null>(clientId);
  const [reloadKey, setReloadKey] = useState(0);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function load() {
    if (!clientId) {
      setRecord({});
      setSavedId(null);
      return;
    }
    const c = (await api().clients.get(clientId)) as Record<string, unknown> | null;
    if (!c) return;
    const next: Record<string, string> = {};
    for (const f of FIELDS) {
      next[f.key] = ((c[f.key] as string | null) ?? '').toString();
    }
    setRecord(next);
    setSavedId(clientId);
  }

  function update(key: string, value: string) {
    setRecord((r) => ({ ...r, [key]: value }));
    setDirty(true);
  }

  async function save() {
    const payload: Record<string, unknown> = {};
    for (const f of FIELDS) {
      const v = record[f.key];
      payload[f.key] = v && v.trim() !== '' ? v : null;
    }
    if (savedId) payload.id = savedId;
    const id = (await api().clients.save(payload)) as number;
    setSavedId(id);
    setDirty(false);
    setReloadKey((k) => k + 1);
    onSaved(id);
  }

  async function deleteClient() {
    if (!savedId) return;
    if (!confirm('Delete this client and all photos? This cannot be undone.')) return;
    await api().clients.delete(savedId);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-30">
      <div className="w-full max-w-3xl bg-white h-full overflow-y-auto shadow-2xl">
        <header className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold">
              {savedId ? `Client #${savedId}` : 'New Client'}
            </h2>
            <p className="text-xs text-neutral-500">
              {dirty ? 'Unsaved changes' : savedId ? 'All changes saved' : 'New record'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn">Close</button>
            {savedId && (
              <button onClick={deleteClient} className="btn btn-danger">Delete</button>
            )}
            <button onClick={save} className="btn btn-primary">Save</button>
          </div>
        </header>

        <div className="p-6 space-y-4">
          {GROUP_ORDER.map((group) => {
            const fields = FIELDS.filter((f) => f.group === group);
            const isPhotos = group === 'Photos';
            if (!isPhotos && fields.length === 0) return null;

            const open = openSections[group];
            return (
              <section key={group} className="border rounded">
                <button
                  type="button"
                  onClick={() =>
                    setOpenSections((s) => ({ ...s, [group]: !s[group] }))
                  }
                  className="w-full text-left px-4 py-3 flex justify-between items-center hover:bg-neutral-50"
                >
                  <div>
                    <h3 className="font-semibold">{group}</h3>
                    <p className="text-xs text-neutral-500">{SECTION_DESC[group]}</p>
                  </div>
                  <span className="text-neutral-400">{open ? '▾' : '▸'}</span>
                </button>
                {open && (
                  <div className="px-4 py-3 border-t space-y-3">
                    {isPhotos ? (
                      <>
                        <PhotoField
                          clientId={savedId}
                          role="image"
                          label="Customer / Garment Photo"
                          reloadKey={reloadKey}
                        />
                        <PhotoField
                          clientId={savedId}
                          role="fabric_photo"
                          label="Fabric Photo"
                          reloadKey={reloadKey}
                        />
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {fields.map((f) => (
                          <MeasurementInput
                            key={f.key}
                            label={f.label}
                            value={record[f.key] ?? ''}
                            onChange={(v) => update(f.key, v)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
