import type { Locator, Page } from '@playwright/test';
import { ContactsNav } from './contacts-nav';

/** Connections, `/contacts/connections` (L2-149). */
export class ContactsConnectionsPage {
  readonly root: Locator;
  readonly nav: ContactsNav;
  readonly heading: Locator;
  readonly sub: Locator;
  readonly back: Locator;
  readonly filters: Locator;
  readonly map: Locator;
  readonly faces: Locator;
  readonly lines: Locator;
  readonly panel: Locator;
  readonly panelHeading: Locator;
  readonly panelSub: Locator;
  readonly panelRows: Locator;
  readonly openProfile: Locator;
  readonly connect: Locator;
  readonly clearFocus: Locator;
  readonly loading: Locator;
  /** The empty and failed states. */
  readonly state: Locator;
  readonly stateHeading: Locator;
  readonly stateText: Locator;
  readonly stateAction: Locator;
  readonly tryAgain: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly pageHead: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="contacts-connections"]');
    this.nav = new ContactsNav(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.pageHead = page.locator('.page-head');
    this.sub = this.pageHead.locator('.page-head__sub');
    this.back = this.pageHead.getByRole('link', { name: 'Groups' });
    this.filters = page.getByRole('group', { name: 'Show' });
    this.map = page.getByRole('group', { name: 'Map of your connections' });
    this.faces = this.map.locator('button.connection-map__node');
    this.lines = this.map.locator('line.connection-map__line');
    this.panel = page.locator('main aside').first();
    this.panelHeading = this.panel.getByRole('heading', { level: 2 });
    this.panelSub = this.panel.locator('p').first();
    this.panelRows = this.panel.locator('ul.divided > li');
    this.openProfile = this.panel.getByRole('link', { name: 'Open profile' });
    this.connect = this.panel
      .getByRole('button', { name: 'Connect', exact: true })
      .or(this.panel.getByRole('link', { name: 'Connect', exact: true }));
    this.clearFocus = this.panel
      .getByRole('button', { name: 'Clear the focus' })
      .or(this.panel.getByRole('link', { name: 'Clear the focus' }));
    this.loading = page.getByRole('status').filter({ hasText: 'Loading your connections…' });
    this.state = page.locator('.empty');
    this.stateHeading = this.state.getByRole('heading');
    this.stateText = this.state.locator('p');
    this.stateAction = this.state.getByRole('button').or(this.state.getByRole('link'));
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
  }

  face(name: string): Locator {
    return this.map.getByRole('button', { name, exact: true });
  }

  filter(name: string): Locator {
    return this.filters.getByRole('button', { name, exact: true });
  }

  row(name: string): Locator {
    return this.panelRows.filter({ hasText: name });
  }
}
