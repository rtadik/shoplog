import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['mdb-reader'] })],
    build: {
      outDir: 'out/main',
      lib: {
        entry: resolve(__dirname, 'electron/main.ts'),
        formats: ['cjs'],
        fileName: () => 'main.js',
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      lib: {
        entry: resolve(__dirname, 'electron/preload.ts'),
        formats: ['cjs'],
        fileName: () => 'preload.js',
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    plugins: [react()],
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      rollupOptions: {
        input: resolve(__dirname, 'src/index.html'),
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@schema': resolve(__dirname, 'schema'),
      },
    },
  },
});
