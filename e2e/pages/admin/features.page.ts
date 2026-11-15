import type { Locator, Page } from '@playwright/test';
import { AdminShell } from './admin-shell';

/** One feature's panel on Features (L2-076 AC1, AC5). */
export class FeaturePanel {
  readonly root: Locator;
  /** The panel that holds it, the region the parity specs compare. */
  readonly panel: Locator;
  readonly name: Locator;
  readonly reach: Locator;
  readonly since: Locator;
  readonly modes: Locator;
  readonly chosen: Locator;
  readonly chips: Locator;
  readonly addPopkin: Locator;

  constructor(page: Page, feature: 'Plan' | 'Schedules') {
    this.root = page.locator('.feature-panel').filter({
      has: page.getByRole('heading', { level: 2, name: feature, exact: true }),
    });
    this.panel = page.locator('.panel').filter({
      has: page.getByRole('heading', { level: 2, name: feature, exact: true }),
    });
    this.name = this.root.locator('.feature-panel__name');
    this.reach = this.root.locator('.feature-panel__reach');
    this.since = this.root.locator('.feature-panel__since');
    this.modes = this.root.getByRole('radiogroup', { name: `Who has ${feature}` });
    this.chosen = this.root.getByRole('list', { name: `Popkins with ${feature}` });
    this.chips = this.chosen
      .getByRole('listitem')
      .filter({ has: page.getByRole('button', { name: /^Remove / }) });
    this.addPopkin = this.root.getByRole('button', { name: 'Add a Popkin' });
  }

  mode(label: 'Off' | 'Chosen Popkins' | 'Everyone'): Locator {
    return this.modes.getByRole('radio', { name: label, exact: true });
  }

  remove(popkin: string): Locator {
    return this.chosen.getByRole('button', { name: `Remove ${popkin}` });
  }
}

/** Features (L2-076): who has Plan and Schedules. */
export class FeaturesPage {
  readonly root: Locator;
  readonly shell: AdminShell;
  readonly heading: Locator;
  readonly plan: FeaturePanel;
  readonly schedules: FeaturePanel;
  readonly loading: Locator;
  readonly empty: Locator;
  readonly tryAgain: Locator;
  readonly toast: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly pageHead: Locator;
  readonly planPanel: Locator;
  readonly schedulesPanel: Locator;
  readonly panels: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="features"]');
    this.shell = new AdminShell(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.plan = new FeaturePanel(page, 'Plan');
    this.schedules = new FeaturePanel(page, 'Schedules');
    this.loading = page.getByRole('status').filter({ hasText: 'Loading the features…' });
    this.empty = page.locator('.panel .empty');
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.toast = page.locator('.toast');
    this.pageHead = page.locator('.page-head');
    this.planPanel = this.plan.panel;
    this.schedulesPanel = this.schedules.panel;
    this.panels = page.locator('.panel');
  }
}

/** "Add a Popkin to Schedules" (L2-076 AC6). */
export class AddFeaturePopkinDialog {
  readonly dialog: Locator;
  readonly panel: Locator;
  readonly description: Locator;
  readonly search: Locator;
  readonly list: Locator;
  readonly options: Locator;
  readonly notes: Locator;
  readonly add: Locator;
  readonly cancel: Locator;
  readonly alert: Locator;

  constructor(page: Page, feature: 'Plan' | 'Schedules') {
    this.dialog = page.getByRole('dialog', { name: `Add a Popkin to ${feature}` });
    this.panel = this.dialog.locator('.dialog__panel');
    this.description = this.dialog.locator('#dlg-desc');
    this.search = this.dialog.getByRole('searchbox', { name: 'Name or code' });
    this.list = this.dialog.getByRole('listbox', { name: 'Live Popkins' });
    this.options = this.list.getByRole('option');
    this.notes = this.list.locator('p');
    this.add = this.dialog.getByRole('button', { name: /Add to|Adding/ });
    this.cancel = this.dialog.getByRole('button', { name: 'Cancel' });
    this.alert = this.dialog.locator('.alert');
  }

  option(name: string): Locator {
    return this.list.getByRole('option', { name: new RegExp(name) });
  }
}
