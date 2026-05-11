import { contextBridge, ipcRenderer } from 'electron';

const api = {
  clients: {
    list: (filter?: string) => ipcRenderer.invoke('clients:list', filter),
    get: (id: number) => ipcRenderer.invoke('clients:get', id),
    save: (record: Record<string, unknown>) =>
      ipcRenderer.invoke('clients:save', record),
    delete: (id: number) => ipcRenderer.invoke('clients:delete', id),
  },
  media: {
    list: (clientId: number) => ipcRenderer.invoke('media:list', clientId),
    add: (args: { clientId: number; role: string; filePath: string }) =>
      ipcRenderer.invoke('media:add', args),
    delete: (id: number) => ipcRenderer.invoke('media:delete', id),
    dataUrl: (filename: string) => ipcRenderer.invoke('media:dataUrl', filename),
    openInExplorer: (filename: string) =>
      ipcRenderer.invoke('media:openInExplorer', filename),
    listUnextracted: () => ipcRenderer.invoke('media:listUnextracted'),
    retryExtraction: (id: number) =>
      ipcRenderer.invoke('media:retryExtraction', id),
  },
  importer: {
    pickAndImport: () => ipcRenderer.invoke('import:pickAndImport'),
  },
  exporter: {
    csv: () => ipcRenderer.invoke('export:csv'),
  },
  files: {
    pickImage: () => ipcRenderer.invoke('files:pickImage'),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ShoplogApi = typeof api;
