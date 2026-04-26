import {expect, type Page} from '@playwright/test';

export class ChatListPage {
  constructor(private page: Page) {}

  private chatRow(chatId: string) {
    return this.page.getByTestId(`chat-row-${chatId}`);
  }

  async expectVisible() {
    await expect(this.page.getByTestId('chat-list')).toBeVisible();
  }

  async expectEmptyState() {
    await expect(this.page.getByTestId('empty-state')).toBeVisible();
  }

  async openChat(chatId: string, name: string) {
    const row = this.chatRow(chatId);
    const viewport = this.page.viewportSize();
    if (viewport && viewport.width < 768 && !(await row.isVisible())) {
      await this.page.goBack();
      await this.expectVisible();
    }
    await row.click();
    await expect(this.page).toHaveURL(new RegExp(`/chat/${chatId}$`));
    await expect(this.page.getByTestId('messages-scroll-container')).toBeVisible();
    await expect(this.page.getByRole('heading', {name}).last()).toBeVisible();
  }

  async searchChats(query: string) {
    await this.page.getByTestId('chat-search-input').fill(query);
  }

  async clearSearch() {
    await this.page.getByTestId('chat-search-input').fill('');
  }

  async expectChatVisible(chatId: string) {
    await expect(this.chatRow(chatId)).toBeVisible();
  }

  async expectChatHidden(chatId: string) {
    await expect(this.chatRow(chatId)).toBeHidden();
  }

  async openNewChatModal() {
    await this.page.getByTestId('open-new-chat-button').click();
  }
}
