import {expect, type Page} from '@playwright/test';

export class ImageViewerPage {
  constructor(private page: Page) {}

  async expectSlide(current: number, total: number) {
    await expect(this.page.getByText(`${current} / ${total}`)).toBeVisible();
  }

  async expectClosed() {
    await expect(this.page.getByText(/\d+ \/ \d+/)).toBeHidden();
  }

  async nextSlideKeyboard() {
    await this.page.keyboard.press('ArrowRight');
  }

  async closeKeyboard() {
    await this.page.keyboard.press('Escape');
  }

  async nextSlideSwipe() {
    const img = this.page.locator('img[alt="Full size"]');
    await img.dragTo(img, {
      sourcePosition: {x: 260, y: 120},
      targetPosition: {x: 20, y: 120},
    });
  }

  async closeTap() {
    await this.page.mouse.click(20, 20);
  }
}
