import {expect, type Locator, type Page} from '@playwright/test';

export class MessageLocator {
  readonly locator: Locator;

  constructor(
    private page: Page,
    private msgId: string,
  ) {
    this.locator = page.getByTestId(`message-${msgId}`);
  }

  async hover() {
    await this.locator.hover();
  }

  async reply() {
    await this.hover();
    await this.locator.getByTestId(`reply-button-${this.msgId}`).click();
  }

  async edit(text: string) {
    await this.hover();
    await this.locator.getByTestId(`quick-edit-button-${this.msgId}`).click();
    const editBox = this.locator.locator('textarea');
    await editBox.fill(text);
    await editBox.press('Enter');
  }

  async react(optionIndex: number) {
    await this.hover();
    await this.locator.getByTestId(`reaction-button-${this.msgId}`).click();
    await this.page.getByTestId(`reaction-option-${this.msgId}-${optionIndex}`).click();
  }

  async rightClick(text: string) {
    await this.locator.getByText(text).click({button: 'right'});
  }

  async copyViaContextMenu() {
    await this.page.getByTestId(`copy-message-${this.msgId}`).click();
  }

  async deleteViaContextMenu() {
    await this.page.getByTestId(`delete-message-${this.msgId}`).click();
  }

  async confirmDelete() {
    await this.page.getByTestId(`confirm-delete-message-${this.msgId}`).click();
  }

  async toggleReadReceipts() {
    await this.page.getByTestId(`toggle-read-receipts-${this.msgId}`).click();
  }

  async expectReadReceipts(...names: string[]) {
    const receipts = this.page.getByTestId(`read-receipts-${this.msgId}`);
    for (const name of names) {
      await expect(receipts).toContainText(name);
    }
  }

  async expectHighlighted() {
    await expect.poll(() =>
      this.locator.evaluate(el => el.classList.contains('ring-2')),
    ).toBe(true);
  }

  async expectContainsText(text: string) {
    await expect(this.locator).toContainText(text);
  }

  async expectVisible() {
    await expect(this.locator).toBeVisible();
  }

  async expectHidden() {
    await expect(this.locator).toBeHidden();
  }
}

export class ChatPage {
  constructor(private page: Page) {}

  get composer() {
    return this.page.locator('textarea').last();
  }

  get messagesContainer() {
    return this.page.getByTestId('messages-scroll-container');
  }

  async distanceFromBottom() {
    return this.messagesContainer.evaluate(element => {
      const container = element as HTMLDivElement;
      return container.scrollHeight - container.scrollTop - container.clientHeight;
    });
  }

  async scrollAwayFromBottom() {
    await this.messagesContainer.evaluate(element => {
      const container = element as HTMLDivElement;
      container.scrollTop = Math.max(0, container.scrollHeight - container.clientHeight - 600);
      container.dispatchEvent(new Event('scroll', {bubbles: true}));
    });
  }

  async expectPinned(maxDistance = 4) {
    await expect.poll(async () => this.distanceFromBottom()).toBeLessThan(maxDistance);
  }

  async expectNotPinned(minDistance = 60) {
    await expect.poll(async () => this.distanceFromBottom()).toBeGreaterThan(minDistance);
  }

  async expectOpen(chatId: string, name: string) {
    await expect(this.page).toHaveURL(new RegExp(`/chat/${chatId}$`));
    await expect(this.page.getByRole('heading', {name}).last()).toBeVisible();
  }

  getMessage(msgId: string) {
    return new MessageLocator(this.page, msgId);
  }

  async fillComposer(text: string) {
    await this.composer.fill(text);
  }

  async expectComposerValue(value: string | RegExp) {
    await expect(this.composer).toHaveValue(value);
  }

  async expectComposerNotValue(value: string) {
    await expect(this.composer).not.toHaveValue(value);
  }

  async sendMultiline(...lines: string[]) {
    await this.composer.fill(lines[0]);
    for (let i = 1; i < lines.length; i++) {
      await this.composer.press('Shift+Enter');
      await this.composer.type(lines[i]);
    }
    await this.composer.press('Enter');
  }

  async expectReplyBanner(name: string) {
    await expect(this.page.getByTestId('reply-banner')).toContainText(name);
  }

  async expectReplyBannerHidden() {
    await expect(this.page.getByTestId('reply-banner')).toBeHidden();
  }

  async dismissReply() {
    await this.composer.click();
    await this.page.keyboard.press('Escape');
  }

  async toggleMessageSearch() {
    await this.page.getByTestId('toggle-message-search-button').click();
  }

  async fillMessageSearch(query: string, opts?: {dateFrom?: string; dateTo?: string}) {
    await this.page.getByTestId('message-search-input').fill(query);
    if (opts?.dateFrom) {
      await this.page.getByTestId('message-search-date-from').fill(opts.dateFrom);
    }
    if (opts?.dateTo) {
      await this.page.getByTestId('message-search-date-to').fill(opts.dateTo);
    }
  }

  async resetMessageSearch() {
    await this.page.getByTestId('reset-message-search-button').click();
  }

  async expectMessageSearchValue(value: string) {
    await expect(this.page.getByTestId('message-search-input')).toHaveValue(value);
  }

  async expectMessageSearchDateRange(dateFrom: string, dateTo: string) {
    await expect(this.page.getByTestId('message-search-date-from')).toHaveValue(dateFrom);
    await expect(this.page.getByTestId('message-search-date-to')).toHaveValue(dateTo);
  }

  async expectSearchFiltersActive() {
    await expect(this.page.getByTestId('message-search-active-filters')).toBeVisible();
  }

  async clickReplyPreview(msgId: string) {
    await this.page.getByTestId(`reply-preview-${msgId}`).click();
  }

  async openImageViewer(altText: string) {
    await this.page.getByAltText(altText).click();
  }

  async stageFiles(files: Array<{name: string; mimeType: string; buffer: Buffer}>) {
    await this.page.locator('input[type="file"]').last().setInputFiles(files);
    await expect(this.page.getByTestId('staged-upload-overlay')).toBeVisible();
  }

  async sendStagedFiles() {
    await this.page.getByTestId('send-staged-files-button').click();
  }

  async openGifPicker() {
    await this.page.getByTestId('gif-toggle-button').click();
  }

  async selectGif(altText: string) {
    await this.page.getByAltText(altText).click();
  }

  async expectLinkWithTarget(name: string, target: string) {
    await expect(this.page.getByRole('link', {name}).first()).toHaveAttribute('target', target);
  }

  async expectVideoVisible(msgId: string) {
    await expect(this.page.getByTestId(`message-${msgId}`).locator('video')).toBeVisible();
  }

  async expectFileLinkVisible(msgId: string, name: string) {
    await expect(this.page.getByTestId(`message-${msgId}`).getByRole('link', {name})).toBeVisible();
  }

  async expectFileLinkInContainer(name: string) {
    await expect(this.page.getByRole('link', {name})).toBeVisible();
  }
}
