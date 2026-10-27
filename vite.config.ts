import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        game: resolve(__dirname, 'continental-drift/index.html'),
        about: resolve(__dirname, 'continental-drift/about/index.html'),
      },
    },
  },
  test: {
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
  },
});
