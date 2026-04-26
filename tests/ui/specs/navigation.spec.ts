import {test, expect} from '../fixtures';

test('syncs URL with open chat and restores state on browser back/forward', async ({page, mobileViewport, chatList}) => {
  test.skip(mobileViewport, 'Mobile navigation is covered in a dedicated test.');

  await chatList.expectEmptyState();

  await chatList.openChat('design-lab', 'Design Lab');
  await expect(page).toHaveURL(/\/chat\/design-lab$/);
  await expect(page).toHaveScreenshot('chat-view-design-lab.png', {fullPage: true});

  await chatList.openChat('anna-private', 'Anna Kovacs');
  await expect(page).toHaveURL(/\/chat\/anna-private$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/chat\/design-lab$/);
  await expect(page.getByRole('heading', {name: 'Design Lab'}).last()).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await chatList.expectEmptyState();
});

test('searches chats and navigates via keyboard shortcuts', async ({page, desktopViewport, chatList}) => {
  await chatList.searchChats('anna');
  await chatList.expectChatVisible('anna-private');
  await chatList.expectChatHidden('design-lab');
  await chatList.clearSearch();

  if (desktopViewport) {
    await page.keyboard.press('Alt+1');
    await expect(page).toHaveURL(/\/chat\/design-lab$/);

    await page.keyboard.press('Alt+ArrowDown');
    await expect(page).toHaveURL(/\/chat\/saved-user-me$/);

    await page.keyboard.press('Alt+ArrowUp');
    await expect(page).toHaveURL(/\/chat\/design-lab$/);
  } else {
    await chatList.openChat('design-lab', 'Design Lab');
    await page.goBack();
    await chatList.expectVisible();
  }
});

test('opens a chat and returns to the list on mobile', async ({page, mobileViewport, chatList}) => {
  test.skip(!mobileViewport, 'This scenario is mobile-specific.');

  await chatList.expectVisible();
  await page.getByTestId('chat-row-design-lab').click();
  await expect(page.getByRole('heading', {name: 'Design Lab'}).last()).toBeVisible();

  await page.goBack();
  await chatList.expectVisible();
});
