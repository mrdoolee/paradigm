import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // shared e2e under tests/e2e, each activity's under activities/<id>/tests/e2e
  testDir: '.',
  testMatch: ['tests/e2e/**/*.spec.ts', 'activities/*/tests/e2e/**/*.spec.ts'],
  testIgnore: ['**/node_modules/**', 'dist/**', 'work/**'],
  outputDir: 'test-results/artifacts',
  fullyParallel: false,
  workers: 2,
  timeout: 180_000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5191' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1, hasTouch: true } },
  ],
  webServer: {
    command: 'npx vite --port 5191 --strictPort',
    url: 'http://localhost:5191',
    reuseExistingServer: !process.env.NOS_FRESH_SERVER,
    timeout: 60_000,
  },
});
