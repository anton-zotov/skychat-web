import {expect, type Page} from '@playwright/test';

export class SettingsModal {
  constructor(private page: Page) {}

  async expectOpen() {
    await expect(this.page.getByTestId('settings-modal')).toBeVisible();
  }

  async setTheme(value: string) {
    await this.page.getByTestId('theme-select').selectOption(value);
  }

  async toggleOnlineStatus() {
    await this.page.getByTestId('toggle-online-status-button').click();
  }
}
