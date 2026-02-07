import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'keeperboard-sdk': path.resolve(__dirname, '../sdk/src/index.ts'),
    },
  },
  server: {
    port: 3001,
  },
});
