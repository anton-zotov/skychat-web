import type {Page} from '@playwright/test';

import {expect, test} from '../fixtures';

const delayedSvg = (
  label: string,
  from: string,
  to: string,
  width = 640,
  height = 1600,
) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}" />
      <stop offset="100%" stop-color="${to}" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="36" fill="url(#g)" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
    font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#ffffff">${label}</text>
</svg>`;

async function installDelayedMediaRoute(page: Page, pathname: string, body: string, delayMs = 500) {
  await page.route(`**${pathname}`, async route => {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body,
    });
  });
}

async function seedHistoryPadding(page: Page, count = 14) {
  await page.evaluate(async messageCount => {
    const baseline = window.__skychatMock?.getDocument('chats/design-lab/messages/msg-anna-1') as any;
    if (!baseline?.createdAt) {
      throw new Error('Missing baseline message timestamp');
    }

    const Timestamp = baseline.createdAt.constructor;
    for (let index = 0; index < messageCount; index += 1) {
      const offset = (messageCount - index) * 60_000;
      await window.__skychatMock?.setDocument(`chats/design-lab/messages/msg-padding-${index}`, {
        id: `msg-padding-${index}`,
        chatId: 'design-lab',
        senderId: index % 2 === 0 ? 'anna' : 'sam',
        text: `Auto-scroll history padding ${index}`,
        type: 'text',
        createdAt: new Timestamp(baseline.createdAt.toMillis() - offset),
        readBy: {
          user_me: new Timestamp(baseline.createdAt.toMillis() - offset + 10_000),
        },
      });
    }
  }, count);
}

async function seedNewestImageMessage(
  page: Page,
  {
    id,
    senderId,
    altText,
    url,
    text,
  }: {id: string; senderId: string; altText: string; url: string; text: string},
) {
  await page.evaluate(async payload => {
    const chat = window.__skychatMock?.getDocument('chats/design-lab') as any;
    if (!chat?.updatedAt) {
      throw new Error('Missing chat timestamp');
    }

    const Timestamp = chat.updatedAt.constructor;
    const createdAt = new Timestamp(chat.updatedAt.toMillis() + 60_000);

    await window.__skychatMock?.setDocument(`chats/design-lab/messages/${payload.id}`, {
      id: payload.id,
      chatId: 'design-lab',
      senderId: payload.senderId,
      text: payload.text,
      type: 'image',
      fileUrl: payload.url,
      fileName: payload.altText,
      createdAt,
      readBy: payload.senderId === 'user_me' ? {} : {user_me: createdAt},
    });

    await window.__skychatMock?.updateDocument('chats/design-lab', {
      updatedAt: createdAt,
      lastMessage: {
        text: '📷 Фото',
        senderId: payload.senderId,
        createdAt,
      },
    });
  }, {id, senderId, altText, url, text});
}

async function waitForImageLoad(page: Page, altText: string) {
  const image = page.getByAltText(altText);
  await expect(image).toBeVisible();
  await expect.poll(async () =>
    image.evaluate(node => (node as HTMLImageElement).naturalHeight),
  ).toBeGreaterThan(0);
}

async function installGifApiOverride(page: Page, imagePath: string) {
  const body = JSON.stringify({
    data: [
      {
        id: 'gif-autoscroll',
        title: 'Delayed Scroll',
        images: {
          fixed_height_small: {
            url: imagePath,
          },
          original: {
            url: imagePath,
          },
        },
      },
    ],
  });

  await page.route('**/api/gifs/trending', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body,
    });
  });

  await page.route('**/api/gifs/search**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body,
    });
  });
}

test.beforeEach(async ({page}) => {
  await seedHistoryPadding(page, 28);
});

test('keeps the chat pinned on open and inbound delayed-image messages, but leaves older reading position alone', async ({page, chat, chatList}) => {
  const openImagePath = '/mock-media/open-chat-late-image.svg';
  const inboundImagePath = '/mock-media/inbound-late-image.svg';
  const pausedImagePath = '/mock-media/inbound-while-reading.svg';

  await installDelayedMediaRoute(page, openImagePath, delayedSvg('Open Chat', '#2563eb', '#0ea5e9'));
  await installDelayedMediaRoute(page, inboundImagePath, delayedSvg('Inbound Pin', '#f97316', '#ef4444'));
  await installDelayedMediaRoute(page, pausedImagePath, delayedSvg('Stay Put', '#14b8a6', '#06b6d4'));

  await seedNewestImageMessage(page, {
    id: 'msg-open-autoscroll',
    senderId: 'maya',
    altText: 'open-chat-late-image.svg',
    url: openImagePath,
    text: 'Delayed image should not knock the chat off the bottom on open.',
  });

  await chatList.openChat('design-lab', 'Design Lab');
  await chat.expectPinned();
  await waitForImageLoad(page, 'open-chat-late-image.svg');
  await chat.expectPinned();

  await seedNewestImageMessage(page, {
    id: 'msg-inbound-autoscroll',
    senderId: 'anna',
    altText: 'inbound-late-image.svg',
    url: inboundImagePath,
    text: 'Inbound delayed image should keep the chat pinned.',
  });

  await waitForImageLoad(page, 'inbound-late-image.svg');
  await chat.expectPinned();

  await chat.scrollAwayFromBottom();
  await chat.expectNotPinned();

  await seedNewestImageMessage(page, {
    id: 'msg-inbound-while-reading',
    senderId: 'sam',
    altText: 'inbound-while-reading.svg',
    url: pausedImagePath,
    text: 'Do not yank the user when they are reading history.',
  });

  await waitForImageLoad(page, 'inbound-while-reading.svg');
  await chat.expectNotPinned();
});

test('forces the chat to the bottom on send for both text and delayed-image messages', async ({page, chat, chatList}) => {
  const sendImagePath = '/mock-media/send-late-image.svg';

  await installDelayedMediaRoute(page, sendImagePath, delayedSvg('Send Pin', '#7c3aed', '#ec4899'));
  await installGifApiOverride(page, sendImagePath);

  await chatList.openChat('design-lab', 'Design Lab');
  await chat.scrollAwayFromBottom();
  await chat.expectNotPinned();

  await chat.fillComposer('Text send should force the view back to the bottom.');
  await page.getByTestId('send-message-button').click();
  await chat.expectPinned();
  await expect(chat.messagesContainer).toContainText('Text send should force the view back to the bottom.');

  await chat.scrollAwayFromBottom();
  await chat.expectNotPinned();

  await chat.openGifPicker();
  await chat.selectGif('Delayed Scroll');
  await chat.expectPinned();
  await waitForImageLoad(page, 'GIF');
  await chat.expectPinned();
});
