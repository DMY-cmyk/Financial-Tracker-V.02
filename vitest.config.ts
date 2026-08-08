import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['.worktrees/**', '.claude/**', '.superpowers/**', 'node_modules/**'],
    testTimeout: 15000,
    // Tests share an in-memory SQLite DB reset via beforeEach.
    // Serialize file execution to keep that invariant.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
