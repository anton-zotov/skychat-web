import {defineConfig, devices} from '@playwright/test';
import path from 'node:path';

const PORT = 4173;
const baseURL = `http://127.0.0.1:${PORT}`;
const workers = 2;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? path.join(
  process.env.LOCALAPPDATA ?? '',
  'ms-playwright',
  'chromium-1234',
  'chrome-win64',
  'chrome.exe',
);

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
    launchOptions: {executablePath},
    locale: 'en-GB',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    timezoneId: 'UTC',
  },
  expect: {
    toHaveScreenshot: {
      // Small tolerance absorbs sub-pixel/anti-aliasing differences between
      // machines (GPU/driver/font rendering); real layout changes are far
      // larger (e.g. 1k+ px). Keep it as low as possible.
      maxDiffPixels: 400,
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
