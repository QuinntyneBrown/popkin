import type { Locator, Page } from '@playwright/test';

/** The Contacts navigation on every Contacts page (L2-121 AC3–AC6). */
export class ContactsNav {
  readonly root: Locator;
  readonly back: Locator;
  readonly name: Locator;
  /** "13 people · only you", or "Only you can see them" with nobody. */
  readonly countLine: Locator;
  readonly tabs: Locator;
  /** Each tab's name, without the Follow-ups badge. */
  readonly tabNames: Locator;
  readonly current: Locator;
  readonly followUpsBadge: Locator;
  /** The badge's number; its name is visually hidden beside it. */
  readonly followUpsCount: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('navigation', { name: 'Contacts' });
    this.back = this.root.getByRole('link', { name: 'Your Popkins' });
    this.name = this.root.locator('.popkin-nav__id strong');
    this.countLine = this.root.locator('.popkin-nav__id-text');
    this.tabs = this.root.locator('li a');
    this.tabNames = this.tabs.locator('> span:not(.badge)');
    this.current = this.root.locator('a[aria-current="page"]');
    this.followUpsBadge = this.tab('Follow-ups').locator('.badge');
    this.followUpsCount = this.followUpsBadge.locator('[aria-hidden="true"]');
  }

  tab(name: string): Locator {
    return this.tabs.filter({ hasText: name });
  }
}
