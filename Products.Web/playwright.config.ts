import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4205',
    browserName: 'chromium',
    channel: process.env['PLAYWRIGHT_CHANNEL'] || undefined,
    headless: true,
    viewport: { width: 1440, height: 1050 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: process.env['PLAYWRIGHT_EXTERNAL_SERVER']
    ? undefined
    : {
        command: 'npm run start -- --host 127.0.0.1 --port 4205',
        url: 'http://127.0.0.1:4205',
        reuseExistingServer: false,
        timeout: 120000,
      },
});
