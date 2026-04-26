import {test, expect} from '../fixtures';

test('renders settings modal in dark theme', async ({page, drawer, settings}) => {
  await drawer.open();
  await drawer.openSettings();
  await settings.expectOpen();

  await settings.setTheme('dark');

  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

  await expect(page.getByTestId('settings-modal')).toHaveScreenshot('settings-modal-dark-surface.png');
});

test('renders side drawer in dark theme', async ({page, drawer, settings}) => {
  await drawer.open();
  await drawer.openSettings();
  await settings.expectOpen();

  await settings.setTheme('dark');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

  await page.keyboard.press('Escape');
  await drawer.open();
  await expect(page.getByTestId('side-drawer')).toBeVisible();

  await expect(page.getByTestId('side-drawer')).toHaveScreenshot('side-drawer-dark-surface.png');
});

test('uses a stable mocked app version in UI tests', async ({page, drawer}) => {
  await drawer.open();
  await expect(page.getByText('v1.0.8')).toBeVisible();
});

test('renders landing screen in dark theme', async ({page, drawer, settings, chatList, desktopViewport}) => {
  await drawer.open();
  await drawer.openSettings();
  await settings.expectOpen();

  await settings.setTheme('dark');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

  await page.keyboard.press('Escape');
  if (desktopViewport) {
    await chatList.expectEmptyState();
  } else {
    await chatList.expectVisible();
  }

  await expect(page).toHaveScreenshot('landing-dark.png', {fullPage: true});
});

test('renders chat header in dark theme', async ({page, drawer, settings, chatList}) => {
  await drawer.open();
  await drawer.openSettings();
  await settings.expectOpen();

  await settings.setTheme('dark');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

  await page.keyboard.press('Escape');
  await chatList.openChat('design-lab', 'Design Lab');
  const chatBackButton = page.getByTestId('chat-back-button');
  await expect(chatBackButton).toBeVisible();
  const chatHeader = chatBackButton.locator('xpath=ancestor::header[1]');

  await expect(chatHeader).toHaveScreenshot('chat-header-dark-surface.png');
});

test('renders new chat modal in dark theme', async ({page, drawer, settings, chatList, newChat}) => {
  await drawer.open();
  await drawer.openSettings();
  await settings.expectOpen();

  await settings.setTheme('dark');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

  await page.keyboard.press('Escape');
  await chatList.openNewChatModal();
  await newChat.expectOpen();

  await expect(page.getByTestId('new-chat-modal')).toHaveScreenshot('new-chat-modal-dark-surface.png');
});

test('renders signed-out login screen in dark theme', async ({page, drawer, settings}) => {
  await drawer.open();
  await drawer.openSettings();
  await settings.expectOpen();

  await settings.setTheme('dark');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

  await page.evaluate(() => window.__skychatMock?.signOut());
  await expect(page.getByTestId('google-sign-in-button')).toBeVisible();

  await expect(page).toHaveScreenshot('login-screen-dark.png', {fullPage: true});
});

test('renders gif picker in dark theme', async ({page, drawer, settings, chatList, chat}) => {
  await drawer.open();
  await drawer.openSettings();
  await settings.expectOpen();

  await settings.setTheme('dark');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

  await page.keyboard.press('Escape');
  await chatList.openChat('design-lab', 'Design Lab');
  await chat.openGifPicker();

  await expect(page.getByTestId('gif-picker')).toHaveScreenshot('gif-picker-dark-surface.png');
});

test('renders staged upload overlay in dark theme', async ({page, drawer, settings, chatList, chat}) => {
  await drawer.open();
  await drawer.openSettings();
  await settings.expectOpen();

  await settings.setTheme('dark');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

  await page.keyboard.press('Escape');
  await chatList.openChat('design-lab', 'Design Lab');
  await chat.stageFiles([
    {
      name: 'preview.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#0ea5e9"/></svg>'),
    },
  ]);

  await expect(page.getByTestId('staged-upload-overlay')).toHaveScreenshot('staged-upload-overlay-dark-surface.png');
});

test('renders incoming call window in dark theme', async ({page, drawer, settings}) => {
  await drawer.open();
  await drawer.openSettings();
  await settings.expectOpen();

  await settings.setTheme('dark');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__skychatMock?.createIncomingCall());
  await expect(page.getByTestId('call-window')).toBeVisible();

  await expect(page.getByTestId('call-window')).toHaveScreenshot('incoming-call-window-dark-surface.png');
});
