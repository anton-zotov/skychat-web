import {test, expect} from '../fixtures';

test('wraps long markdown table messages without widening the chat layout', async ({page, chatList, chat}) => {
  await page.evaluate(async () => {
    const chatDoc = window.__skychatMock?.getDocument('chats/design-lab') as any;
    if (!chatDoc?.updatedAt) {
      throw new Error('Missing chat timestamp');
    }

    const Timestamp = chatDoc.updatedAt.constructor;
    const createdAt = new Timestamp(chatDoc.updatedAt.toMillis() + 60_000);
    const longToken = 'supercalifragilistic'.repeat(24);

    await window.__skychatMock?.setDocument('chats/design-lab/messages/msg-long-unbroken', {
      id: 'msg-long-unbroken',
      chatId: 'design-lab',
      senderId: 'sam',
      text: `A long table cell should wrap:\n\n| Field | Value |\n| --- | --- |\n| Token | ${longToken} |`,
      type: 'text',
      createdAt,
      readBy: {
        user_me: createdAt,
      },
    });

    await window.__skychatMock?.updateDocument('chats/design-lab', {
      updatedAt: createdAt,
      lastMessage: {
        text: 'A long link/token should wrap',
        senderId: 'sam',
        createdAt,
      },
    });
  });

  await chatList.openChat('design-lab', 'Design Lab');

  const layout = await chat.getMessage('msg-long-unbroken').locator.evaluate(message => {
    const container = document.querySelector('[data-testid="messages-scroll-container"]') as HTMLElement;
    const bubble = message.querySelector('.markdown-body')?.parentElement as HTMLElement | null;
    const text = message.querySelector('.markdown-body') as HTMLElement | null;
    const tableCell = message.querySelector('td') as HTMLElement | null;
    if (!container || !bubble || !text) {
      throw new Error('Missing message layout nodes');
    }

    const containerRect = container.getBoundingClientRect();
    const messageRect = message.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();

    return {
      containerClientWidth: container.clientWidth,
      containerScrollWidth: container.scrollWidth,
      messageLeft: messageRect.left,
      messageRight: messageRect.right,
      bubbleRight: bubbleRect.right,
      textRight: textRect.right,
      containerLeft: containerRect.left,
      containerRight: containerRect.right,
      cellOverflowWrap: tableCell ? getComputedStyle(tableCell).overflowWrap : null,
    };
  });

  expect(layout.containerScrollWidth).toBeLessThanOrEqual(layout.containerClientWidth);
  expect(layout.messageLeft).toBeGreaterThanOrEqual(layout.containerLeft);
  expect(layout.messageRight).toBeLessThanOrEqual(layout.containerRight);
  expect(layout.bubbleRight).toBeLessThanOrEqual(layout.containerRight);
  expect(layout.textRight).toBeLessThanOrEqual(layout.containerRight);
  expect(layout.cellOverflowWrap).toBe('anywhere');
});

test('renders markdown, video, and attachments; supports in-chat search, reply jumping, read receipts, and image viewer', async ({page, desktopViewport, chatList, chat, imageViewer}) => {
  await chatList.openChat('design-lab', 'Design Lab');

  // Markdown rendering
  await chat.expectLinkWithTarget('release notes', '_blank');
  await chat.getMessage('msg-anna-2').expectContainsText('keep multiline formatting intact');

  // Video and file attachment
  await chat.expectVideoVisible('msg-sam-video');
  await chat.expectFileLinkVisible('msg-sam-video', 'release-checklist.txt');

  // In-chat search with date filter
  await chat.toggleMessageSearch();
  await chat.fillMessageSearch('release-checklist');
  await chat.getMessage('msg-file-search').expectVisible();
  await chat.getMessage('msg-me-2').expectHidden();
  await expect(page).toHaveScreenshot('in-chat-search.png', {fullPage: true});

  await chat.fillMessageSearch('release-checklist', {dateFrom: '2026-04-26', dateTo: '2026-04-26'});
  await chat.expectSearchFiltersActive();
  await chat.expectMessageSearchDateRange('2026-04-26', '2026-04-26');
  await chat.getMessage('msg-file-search').expectVisible();
  await chat.resetMessageSearch();
  await chat.expectMessageSearchValue('');
  await chat.expectMessageSearchDateRange('', '');
  await chat.getMessage('msg-me-2').expectVisible();

  await chat.toggleMessageSearch();
  await chat.getMessage('msg-me-2').expectVisible();

  // Reply jumping
  await chat.clickReplyPreview('msg-sam-1');
  await chat.getMessage('msg-me-1').expectHighlighted();

  // Read receipts (desktop only)
  if (desktopViewport) {
    await chat.getMessage('msg-me-1').toggleReadReceipts();
    await chat.getMessage('msg-me-1').expectReadReceipts('Anna Kovacs', 'Sam Turner');
  }

  // Image viewer navigation
  await chat.openImageViewer('banner-a.png');
  await imageViewer.expectSlide(1, 2);
  await expect(page).toHaveScreenshot('image-viewer.png', {fullPage: true});

  if (desktopViewport) {
    await imageViewer.nextSlideKeyboard();
    await imageViewer.expectSlide(2, 2);
    await imageViewer.closeKeyboard();
    await imageViewer.expectClosed();
  } else {
    await imageViewer.nextSlideSwipe();
    await imageViewer.expectSlide(2, 2);
    await imageViewer.closeTap();
    await imageViewer.expectClosed();
  }
});

