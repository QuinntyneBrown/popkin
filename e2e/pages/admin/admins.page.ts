import type { Locator, Page } from '@playwright/test';
import { AdminShell } from './admin-shell';

/** Admins & roles (L2-119, L2-086): who can sign in to the console, and what each role can do. */
export class AdminsPage {
  readonly root: Locator;
  readonly shell: AdminShell;
  readonly heading: Locator;
  readonly sub: Locator;
  readonly addAdmin: Locator;
  readonly adminsTab: Locator;
  readonly rolesTab: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly permissions: Locator;
  readonly loading: Locator;
  readonly empty: Locator;
  readonly tryAgain: Locator;
  readonly toast: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly pageHead: Locator;
  readonly tabs: Locator;
  readonly panel: Locator;
  readonly tableWrap: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="admins"]');
    this.shell = new AdminShell(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.sub = page.locator('.page-head__sub');
    this.addAdmin = page.getByRole('button', { name: 'Add admin' });
    this.adminsTab = page.getByRole('tab', { name: /^Admins/ });
    this.rolesTab = page.getByRole('tab', { name: 'What each role can do' });
    this.table = page.getByRole('table', { name: 'Admins' });
    this.rows = this.table.locator('tbody tr');
    this.permissions = page.getByRole('table', { name: 'What each role can do' });
    this.loading = page.getByRole('status').filter({ hasText: 'Loading the admins…' });
    this.empty = page.locator('.panel .empty');
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.toast = page.locator('.toast');
    this.pageHead = page.locator('.page-head');
    this.tabs = page.locator('.segmented');
    this.panel = page.locator('.panel');
    this.tableWrap = this.panel.locator('.table-wrap');
  }

  row(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  role(name: string): Locator {
    return this.page.getByRole('combobox', { name: `Role for ${name}` });
  }

  remove(name: string): Locator {
    return this.page.getByRole('button', { name: `Remove ${name}` });
  }
}
