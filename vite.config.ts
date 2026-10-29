import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        game: resolve(import.meta.dirname, 'continental-drift/index.html'),
      },
    },
  },
  test: {
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
  },
});
