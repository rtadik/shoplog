import type { ShoplogApi } from '../../electron/preload';

declare global {
  interface Window {
    api: ShoplogApi;
  }
}

export const api = (): ShoplogApi => window.api;

export interface ClientRow {
  id: number;
  [key: string]: unknown;
}

export interface MediaRow {
  id: number;
  client_id: number;
  role: string;
  filename: string;
  original_name: string | null;
  extracted: number;
  raw_blob_filename: string | null;
  created_at: string;
}

export interface ImportSummary {
  filename: string;
  tablesScanned: string[];
  imported: number;
  updated: number;
  skipped: number;
  mediaExtracted: number;
  mediaFailed: number;
  warnings: string[];
}
