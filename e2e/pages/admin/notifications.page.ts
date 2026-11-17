import type { Locator, Page } from '@playwright/test';
import { AdminShell } from './admin-shell';

/** One kind's row on the Kinds tab (L2-169 AC4, L2-171 AC2). */
export class NotificationKindRow {
  readonly row: Locator;
  readonly name: Locator;
  readonly about: Locator;
  readonly off: Locator;
  readonly sent: Locator;
  readonly opened: Locator;
  readonly switch: Locator;
  readonly required: Locator;

  constructor(page: Page, kind: string) {
    this.row = page.locator('.data-table tbody tr').filter({
      has: page.locator('.kind-name', { hasText: kind }),
    });
    this.name = this.row.locator('.kind-name');
    this.about = this.row.locator('.kind-about');
    this.off = this.row.locator('.kind-name .status');
    this.sent = this.row.locator('td[data-label="Sent, 24 h"]');
    this.opened = this.row.locator('td[data-label="Opened"]');
    this.switch = this.row.getByRole('switch', { name: `${kind} for everyone` });
    this.required = this.row.locator('.lock-note');
  }
}

/** Notifications (L2-169 to L2-173): the sending status and the Kinds, Holds and Defaults tabs. */
export class NotificationsPage {
  readonly root: Locator;
  readonly shell: AdminShell;
  readonly heading: Locator;
  readonly sub: Locator;
  readonly status: Locator;
  readonly statusTitle: Locator;
  readonly statusText: Locator;
  readonly pause: Locator;
  readonly resume: Locator;
  readonly tabs: Locator;
  readonly groups: Locator;
  readonly loading: Locator;
  readonly empty: Locator;
  readonly tryAgain: Locator;
  readonly toast: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly pageHead: Locator;
  readonly pageTabs: Locator;
  readonly panel: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="notifications"]');
    this.shell = new AdminShell(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.sub = page.locator('.page-head__sub');
    this.status = page.locator('.send-status');
    this.statusTitle = this.status.locator('.send-status__title');
    this.statusText = this.status.locator('.send-status__text');
    this.pause = this.status.getByRole('button', { name: 'Pause all email' });
    this.resume = this.status.getByRole('button', { name: 'Resume sending' });
    this.tabs = page.getByRole('tablist', { name: 'Notifications' });
    this.groups = page.locator('.data-table__group th');
    this.loading = page.getByRole('status').filter({ hasText: 'Loading notifications…' });
    this.empty = page.locator('.panel .empty');
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.toast = page.locator('.toast');
    this.pageHead = page.locator('.page-head');
    this.pageTabs = page.locator('.page-tabs');
    this.panel = page.locator('.panel').first();
  }

  tab(name: 'Kinds' | 'Holds' | 'Defaults'): Locator {
    return this.tabs.getByRole('tab', { name: new RegExp(`^${name}`) });
  }

  kind(name: string): NotificationKindRow {
    return new NotificationKindRow(this.page, name);
  }
}
