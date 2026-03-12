import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/lib/api/version.test.ts'], // Manual test file, run with npx tsx
    environment: 'node',
  },
});
