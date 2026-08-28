import { nitro } from 'nitro/vite';
import portless from 'unplugin-portless/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['better-sqlite3'],
    },
  },
  plugins: [nitro(), portless()],
});
