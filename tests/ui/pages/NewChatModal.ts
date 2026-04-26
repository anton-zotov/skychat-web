import {expect, type Page} from '@playwright/test';

export class NewChatModal {
  constructor(private page: Page) {}

  async expectOpen() {
    await expect(this.page.getByTestId('new-chat-modal')).toBeVisible();
  }

  async selectContact(name: string) {
    await this.page.getByTestId(`contact-option-${name}`).click();
  }

  async setGroupName(name: string) {
    await this.page.getByTestId('new-chat-group-name-input').fill(name);
  }

  async searchContacts(query: string) {
    await this.page.getByTestId('new-chat-contact-search-input').fill(query);
  }

  async expectContactVisible(name: string) {
    await expect(this.page.getByTestId(`contact-option-${name}`)).toBeVisible();
  }

  async expectContactHidden(name: string) {
    await expect(this.page.getByTestId(`contact-option-${name}`)).toBeHidden();
  }

  async expectSelectedContact(name: string) {
    await expect(this.page.getByTestId(`selected-contact-chip-${name}`)).toBeVisible();
  }

  async create() {
    await this.page.getByTestId('create-chat-button').click();
  }
}
