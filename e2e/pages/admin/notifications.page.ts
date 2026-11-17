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

/** One hold on the Holds tab (L2-172 AC1, AC5). */
export class NotificationHoldRow {
  readonly row: Locator;
  readonly name: Locator;
  readonly line: Locator;
  readonly why: Locator;
  readonly by: Locator;
  readonly until: Locator;
  readonly release: Locator;
  readonly automatic: Locator;

  constructor(panel: Locator, name: string) {
    this.row = panel.locator('.data-table tbody tr').filter({
      has: panel.page().locator('.who__name', { hasText: name }),
    });
    this.name = this.row.locator('.who__name');
    this.line = this.row.locator('.who__sub');
    this.why = this.row.locator('td[data-label="Why"]');
    this.by = this.why.locator('.kind-about');
    this.until = this.row.locator('td[data-label="Until"]');
    this.release = this.row.getByRole('button', { name: `Release the hold on ${name}` });
    this.automatic = this.row.locator('.status', { hasText: 'Automatic' });
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
  /** The Holds tab (L2-172). */
  readonly held: Locator;
  readonly heldSub: Locator;
  readonly holdRows: Locator;
  readonly holdAPopkin: Locator;
  readonly heldNote: Locator;
  /** "Hold a Popkin"'s popover: the search, its matches and its notes (L2-172 AC2). */
  readonly holdPopover: Locator;
  readonly holdSearch: Locator;
  readonly holdMatches: Locator;
  readonly holdNotes: Locator;
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
    // By its title's class, not its role, so it is found under an open dialog too.
    this.held = page.locator('.panel').filter({
      has: page.locator('.panel__title', { hasText: /^Held$/ }),
    });
    this.heldSub = this.held.locator('.panel__sub');
    this.holdRows = this.held.locator('.data-table tbody tr');
    this.holdAPopkin = this.held.getByRole('button', { name: 'Hold a Popkin' });
    this.heldNote = page.locator('.panel__aside-note');
    this.holdPopover = page.getByRole('dialog', { name: 'Hold a Popkin' });
    this.holdSearch = this.holdPopover.getByRole('searchbox', { name: 'Name or code' });
    this.holdMatches = this.holdPopover.getByRole('option');
    this.holdNotes = this.holdPopover.locator('.pick-list__note');
    this.pageHead = page.locator('.page-head');
    this.pageTabs = page.locator('.page-tabs');
    this.panel = page.locator('.panel').first();
  }

  tab(name: 'Kinds' | 'Holds' | 'Defaults'): Locator {
    return this.tabs.getByRole('tab', { name: new RegExp(`^${name}`) });
  }

  holdMatch(name: string): Locator {
    return this.holdMatches.filter({ hasText: name });
  }

  hold(name: string): NotificationHoldRow {
    return new NotificationHoldRow(this.held, name);
  }

  kind(name: string): NotificationKindRow {
    return new NotificationKindRow(this.page, name);
  }
}
