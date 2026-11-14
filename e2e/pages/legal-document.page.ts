import type { Locator, Page } from '@playwright/test';

/**
 * The Terms (`/terms`, L2-083) and the Privacy notice (`/privacy`, L2-082): fixed copy, a section
 * per `h2`, and a link to the other page at the end.
 */
export class LegalDocumentPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly updated: Locator;
  readonly main: Locator;
  /** The other page, linked at the end of the document. */
  readonly otherPage: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly topBar: Locator;
  readonly prose: Locator;

  constructor(
    private readonly page: Page,
    which: 'terms' | 'privacy',
  ) {
    this.root = page.locator(`body[data-page="${which}"]`);
    this.heading = page.getByRole('heading', { level: 1 });
    this.updated = page.locator('.screen__lead');
    this.main = page.getByRole('main');
    this.otherPage = page.getByRole('link', {
      name: which === 'terms' ? 'Read the Privacy notice' : 'Read the Terms',
    });
    this.topBar = page.locator('.topbar');
    this.prose = page.locator('.prose');
  }

  /** A section of the document, by its `h2`. */
  section(heading: string): Locator {
    return this.page
      .locator('.prose__section')
      .filter({ has: this.page.getByRole('heading', { level: 2, name: heading, exact: true }) });
  }
}
