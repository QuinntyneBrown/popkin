import type { Locator, Page } from '@playwright/test';

/** Join with a code, `/join` (L2-015 AC5, AC6, L2-053 AC3, AC4): "Got a code?". */
export class JoinCodePage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  /** "Invite code or link". */
  readonly code: Locator;
  readonly hint: Locator;
  readonly error: Locator;
  /** "Find my Popkin", or "Finding your Popkin…" while the lookup runs. */
  readonly find: Locator;
  readonly scanInstead: Locator;
  readonly back: Locator;
  readonly alert: Locator;
  /** The picture half of the split screen, from 768 px (L2-058 AC10). */
  readonly picture: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly screen: Locator;
  readonly topBar: Locator;
  readonly field: Locator;
  readonly actions: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="join-code"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.lead = page.locator('main p').first();
    this.code = page.getByRole('textbox', { name: 'Invite code or link' });
    this.hint = page.locator('#code-hint');
    this.error = page.locator('#code-err');
    this.find = page.getByRole('button', { name: /^(Find my Popkin|Finding your Popkin…)$/ });
    this.scanInstead = page.getByRole('button', { name: 'Scan a QR code instead' });
    this.back = page.getByRole('link', { name: 'Back' });
    this.alert = page.locator('.screen__body .alert');
    this.picture = page.getByRole('complementary', { name: 'Popkin' });
    this.screen = page.locator('.screen');
    this.topBar = page.locator('.topbar');
    this.field = page.locator('.field').filter({ has: page.locator('#code') });
    this.actions = page.locator('.screen__body .push');
  }
}
