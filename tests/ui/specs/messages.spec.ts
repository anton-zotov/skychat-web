import {test, expect} from '../fixtures';

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

