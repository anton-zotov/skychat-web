import {test, expect} from '../fixtures';

test('uploads staged files, sends a GIF, records it in recents, and handles incoming call UI', async ({page, mobileViewport, chatList, chat}) => {
  await chatList.openChat('design-lab', 'Design Lab');

  // Staged file upload
  await chat.stageFiles([
    {
      name: 'preview.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#0ea5e9"/></svg>'),
    },
    {
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('attachment body'),
    },
  ]);
  await expect(page).toHaveScreenshot('staged-upload-overlay.png', {fullPage: true});
  await chat.sendStagedFiles();
  await chat.expectFileLinkInContainer('notes.txt');

  // GIF sending and recent GIFs
  await chat.openGifPicker();
  await chat.selectGif('Design Sync');
  await expect.poll(() =>
    page.evaluate(() => {
      const messages = window.__skychatMock?.getCollection('chats/design-lab/messages') as Array<{data: any}> | undefined;
      return messages?.some(entry => entry.data?.fileName === 'GIF');
    }),
  ).toBe(true);
  await expect.poll(() =>
    page.evaluate(() => {
      const doc = window.__skychatMock?.getDocument('users/user_me') as any;
      return doc?.recentGifs?.[0]?.id;
    }),
  ).toBe('gif-design');

  // Incoming call
  await page.evaluate(() => window.__skychatMock?.createIncomingCall());
  await expect(page.getByTestId('call-window')).toBeVisible();
  await expect(page).toHaveScreenshot('incoming-call-window.png', {fullPage: true});
  await page.getByTestId('reject-call-button').click();
  await expect(page.getByTestId('call-window')).toBeHidden();

  // Mobile back navigation
  if (mobileViewport) {
    await page.goBack();
    await chatList.expectVisible();
  }
});
