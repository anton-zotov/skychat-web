import {expect, type Page} from '@playwright/test';

export class DrawerPage {
  constructor(private page: Page) {}

  async open() {
    await this.page.getByTestId('open-drawer-button').click();
    await expect(this.page.getByTestId('side-drawer')).toBeVisible();
  }

  async requestNotifications() {
    await this.page.getByTestId('request-notifications-button').click();
  }

  async openSettings() {
    await this.page.getByTestId('open-settings-button').click();
  }
}
