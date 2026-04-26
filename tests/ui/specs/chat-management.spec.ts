import {test, expect} from '../fixtures';

test('reuses existing direct chat and creates a new group chat', async ({page, mobileViewport, chatList, newChat}) => {
  await chatList.openNewChatModal();
  await newChat.expectOpen();
  await expect(page).toHaveScreenshot('new-chat-modal.png', {fullPage: true});
  await newChat.searchContacts('anna');
  await newChat.expectContactVisible('anna');
  await newChat.expectContactHidden('maya');
  await newChat.selectContact('anna');
  await newChat.expectSelectedContact('anna');
  await newChat.create();
  await expect(page).toHaveURL(/\/chat\/anna-private$/);

  if (mobileViewport) {
    await page.goBack();
    await chatList.expectVisible();
  }

  await chatList.openNewChatModal();
  await newChat.searchContacts('ma');
  await newChat.expectContactVisible('maya');
  await newChat.expectContactHidden('sam');
  await newChat.searchContacts('');
  await newChat.setGroupName('Release Crew');
  await newChat.selectContact('anna');
  await newChat.selectContact('maya');
  await newChat.expectSelectedContact('anna');
  await newChat.expectSelectedContact('maya');
  await newChat.create();
  await expect(page.getByRole('heading', {name: 'Release Crew'}).last()).toBeVisible();

  if (mobileViewport) {
    await page.goBack();
    await chatList.expectVisible();
  }
  await chatList.expectChatVisible('chats_1');
});
