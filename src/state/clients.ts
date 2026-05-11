import { useCallback, useEffect, useState } from 'react';
import { api, type ClientRow } from '../lib/ipc';

export function useClientList() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = (await api().clients.list(filter)) as ClientRow[];
    setClients(list);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { clients, filter, setFilter, loading, refresh };
}
