import type { Locator, Page } from '@playwright/test';

/** The toasts, over whatever screen is open (L2-056 AC7). */
export class Toasts {
  readonly toast: Locator;
  readonly dismiss: Locator;

  constructor(page: Page) {
    this.toast = page.locator('.toast');
    this.dismiss = this.toast.getByRole('button', { name: 'Dismiss' });
  }

  /** What a toast offers to do about it: "Try again", "Undo". */
  action(name: string): Locator {
    return this.toast.locator('.toast__action', { hasText: name });
  }
}
