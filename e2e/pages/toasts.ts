import type { Locator, Page } from '@playwright/test';

/** The toasts, over whatever screen is open (L2-056 AC7). */
export class Toasts {
  /** The polite live region the toasts stack in. */
  readonly region: Locator;
  readonly toast: Locator;
  readonly dismiss: Locator;
  /** A failure, which stays until dismissed (L2-124 AC3). */
  readonly danger: Locator;
  /** A warning: offline, or notifications blocked (L2-123 AC4, ADR 0028). */
  readonly warning: Locator;

  constructor(page: Page) {
    this.region = page.locator('.toast-region');
    this.toast = page.locator('.toast');
    this.dismiss = this.toast.getByRole('button', { name: 'Dismiss' });
    this.danger = page.locator('.toast--danger');
    this.warning = page.locator('.toast--warning');
  }

  /** The toast headed `heading`: a reminder, "Grace turns 33 on Saturday" (L2-140 AC1). */
  headed(heading: string): Locator {
    return this.toast.filter({
      has: this.toast.page().locator('.toast__title', { hasText: heading }),
    });
  }

  /** What a toast offers to do about it: "Try again", "Undo". */
  action(name: string): Locator {
    return this.toast.locator('.toast__action', { hasText: name });
  }
}
