import type { Locator, Page } from '@playwright/test';
import { AdminShell } from './admin-shell';

/** The audit log (L2-120): every action taken in the console. */
export class AuditPage {
  readonly root: Locator;
  readonly shell: AdminShell;
  readonly heading: Locator;
  readonly table: Locator;
  /** The entries, without the rows that name a day. */
  readonly rows: Locator;
  readonly days: Locator;
  readonly exportCsv: Locator;
  readonly search: Locator;
  readonly admin: Locator;
  readonly clearFilters: Locator;
  readonly showing: Locator;
  readonly olderActions: Locator;
  readonly loading: Locator;
  readonly empty: Locator;
  readonly tryAgain: Locator;
  readonly openHealth: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly toolbar: Locator;
  readonly adminField: Locator;
  readonly foot: Locator;
  readonly pageHead: Locator;
  readonly panel: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="audit"]');
    this.shell = new AdminShell(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.table = page.getByRole('table', { name: 'Audit log' });
    this.rows = this.table.locator('tbody tr:not(.data-table__group)');
    this.days = this.table.locator('tbody .data-table__group');
    this.exportCsv = page.getByRole('link', { name: 'Export CSV' });
    this.search = page.getByRole('searchbox', { name: 'Search actions, people or Popkins' });
    this.admin = page.getByRole('combobox', { name: 'Admin' });
    this.clearFilters = page.getByRole('button', { name: 'Clear filters' });
    this.showing = page.locator('.panel__foot');
    this.olderActions = page.getByRole('button', { name: 'Older actions' });
    this.loading = page.getByRole('status').filter({ hasText: 'Loading the audit log…' });
    this.empty = page.locator('.panel .empty');
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.openHealth = page.getByRole('link', { name: 'Open Health' });
    this.toolbar = page.locator('.toolbar');
    this.adminField = this.admin;
    this.foot = page.locator('.panel__foot');
    this.pageHead = page.locator('.page-head');
    this.panel = page.locator('.panel');
  }
}
