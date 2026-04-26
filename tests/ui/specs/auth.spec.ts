import {test, expect} from '../fixtures';

test('signs out and back in via Google button', async ({page, mobileViewport, chatList}) => {
  test.skip(mobileViewport, 'Mobile navigation is covered in a dedicated test.');

  await chatList.expectEmptyState();

  await page.evaluate(() => window.__skychatMock?.signOut());
  await expect(page.getByTestId('google-sign-in-button')).toBeVisible();
  await expect(page).toHaveScreenshot('sign-out-empty-state.png', {fullPage: true});

  await page.getByTestId('google-sign-in-button').click();
  await chatList.expectVisible();
});
