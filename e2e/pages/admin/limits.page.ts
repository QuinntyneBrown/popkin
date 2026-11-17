import type { Locator, Page } from '@playwright/test';
import { AdminShell } from './admin-shell';

/** Limits (L2-117, L2-176): the panel "Sessions" with "Sign-in lasts", and the save bar. */
export class LimitsPage {
  readonly root: Locator;
  readonly shell: AdminShell;
  readonly heading: Locator;
  readonly sub: Locator;
  readonly panels: Locator;
  /** The panel "Sessions" (L2-176 AC3). */
  readonly sessions: Locator;
  readonly sessionsSub: Locator;
  readonly signInRow: Locator;
  readonly signInName: Locator;
  readonly signInHelp: Locator;
  readonly signInUnit: Locator;
  readonly signInError: Locator;
  readonly signInLasts: Locator;
  readonly saveBar: Locator;
  readonly saveBarText: Locator;
  readonly discard: Locator;
  readonly saveLimits: Locator;
  readonly loading: Locator;
  readonly empty: Locator;
  readonly tryAgain: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="limits"]');
    this.shell = new AdminShell(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.sub = page.locator('.page-head__sub');
    this.panels = page.locator('.panel__title');
    this.sessions = page.locator('.panel').filter({
      has: page.getByRole('heading', { name: 'Sessions' }),
    });
    this.sessionsSub = this.sessions.locator('.panel__sub');
    this.signInRow = this.sessions.locator('.limit').filter({ hasText: 'Sign-in lasts' });
    this.signInName = this.signInRow.locator('.limit__name');
    this.signInHelp = this.signInRow.locator('.limit__help');
    this.signInUnit = this.signInRow.locator('.limit__unit');
    this.signInError = this.signInRow.locator('.field__error');
    this.signInLasts = this.sessions.getByRole('textbox', { name: 'Sign-in lasts' });
    this.saveBar = page.locator('.save-bar');
    this.saveBarText = this.saveBar.locator('.save-bar__text');
    this.discard = this.saveBar.getByRole('button', { name: 'Discard' });
    this.saveLimits = this.saveBar.getByRole('button', { name: 'Save limits' });
    this.loading = page.getByRole('status').filter({ hasText: 'Loading the limits…' });
    this.empty = page.locator('.empty');
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.toast = page.locator('.toast');
  }
}
