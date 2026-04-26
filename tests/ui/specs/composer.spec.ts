import {test, expect, getTestState} from '../fixtures';

test('persists drafts, supports reply/edit/react/delete/copy, emoji suggestions, and multiline sending', async ({page, desktopViewport, chatList, chat}) => {
  await chatList.openChat('design-lab', 'Design Lab');
  await expect(chat.composer).toBeVisible();

  // Draft persistence
  await chat.fillComposer('Draft text');
  if (desktopViewport) {
    await chatList.openChat('launch-ops', 'Launch Ops');
    await chatList.openChat('design-lab', 'Design Lab');
    await chat.expectComposerValue('Draft text');
  } else {
    await expect.poll(() => page.evaluate(() => localStorage.getItem('draft_design-lab'))).toBe('Draft text');
    await page.reload();
    await chatList.expectVisible();
    await chatList.openChat('design-lab', 'Design Lab');
    await chat.fillComposer('Draft text');
  }

  // Reply, edit, react, copy, delete (desktop only — requires hover actions)
  if (desktopViewport) {
    const inbound = chat.getMessage('msg-sam-1');
    await inbound.reply();
    await chat.expectReplyBanner('Sam Turner');
    await expect(page).toHaveScreenshot('composer-reply-banner.png', {fullPage: true});
    await chat.dismissReply();
    await chat.expectReplyBannerHidden();

    const own = chat.getMessage('msg-me-2');
    await own.edit('Updated deterministic backend note');
    await own.expectContainsText('Updated deterministic backend note');

    await own.react(2);
    await expect.poll(() =>
      page.evaluate(() => {
        const doc = window.__skychatMock?.getDocument('chats/design-lab/messages/msg-me-2') as any;
        return Array.isArray(doc?.reactions?.['😂']) ? doc.reactions['😂'].includes('user_me') : false;
      }),
    ).toBe(true);

    await own.rightClick('Updated deterministic backend note');
    await own.copyViaContextMenu();
    await expect.poll(async () => (await getTestState(page))?.clipboardText).toContain('Updated deterministic backend note');

    await own.rightClick('Updated deterministic backend note');
    await own.deleteViaContextMenu();
    await own.confirmDelete();
    await own.expectHidden();
  }

  // Emoji suggestion auto-complete
  await chat.fillComposer(':fire');
  await page.keyboard.press('Enter');
  await chat.expectComposerNotValue(':fire');
  await chat.expectComposerValue(/\s$/);

  // Multiline send
  await chat.sendMultiline('Line one', 'Line two');
  await expect(chat.messagesContainer).toContainText('Line one');
  await expect(chat.messagesContainer).toContainText('Line two');
});
