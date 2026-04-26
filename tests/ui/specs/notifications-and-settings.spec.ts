import {test, expect, getTestState} from '../fixtures';

test('sets up notifications, updates badges, persists theme/privacy settings', async ({page, desktopViewport, drawer, settings}) => {
  await page.evaluate(() => window.__setNotificationPermission?.('granted'));

  // Notification subscription
  await drawer.open();
  await drawer.requestNotifications();
  await expect.poll(async () => {
    const state = await getTestState(page);
    return state?.subscription?.endpoint ?? null;
  }).not.toBeNull();

  // Badge and title (desktop only)
  if (desktopViewport) {
    await expect.poll(async () => {
      const state = await getTestState(page);
      return state?.badgeCount ?? null;
    }).toBe(1);
    await expect(page).toHaveTitle(/\(1\) SkyChat Messenger/);
  }

  // Settings modal
  await drawer.open();
  await drawer.openSettings();
  await settings.expectOpen();
  await expect(page).toHaveScreenshot('settings-modal-light.png', {fullPage: true});

  // Theme: dark
  await settings.setTheme('dark');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  await expect(page).toHaveScreenshot('settings-modal-dark.png', {fullPage: true});

  // Theme: system (dark)
  await settings.setTheme('system');
  await page.evaluate(() => window.__setSystemTheme?.('dark'));
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

  // Privacy: hide online status
  await settings.toggleOnlineStatus();
  await expect.poll(() =>
    page.evaluate(() => {
      const doc = window.__skychatMock?.getDocument('users/user_me') as any;
      return doc?.privacy?.showOnlineStatus;
    }),
  ).toBe(false);
});
