import {defineConfig, devices} from '@playwright/test';

const PORT = 4173;
const baseURL = `http://127.0.0.1:${PORT}`;
const workers = 2;

export default defineConfig({
  testDir: './tests/ui/specs',
  snapshotPathTemplate:
    '{testDir}/../snapshots/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}',
  fullyParallel: true,
  workers,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', {open: 'never'}], ['list']] : 'dot',
  use: {
    baseURL,
    locale: 'en-GB',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    timezoneId: 'UTC',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 0,
      animations: 'disabled',
      caret: 'hide',
      scale: 'device',
    },
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 1440, height: 1024},
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
      },
    },
  ],
  webServer: {
    command: `npm run dev:vite -- --host 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
