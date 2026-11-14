import type { Locator, Page } from '@playwright/test';

/** The landing page, `/` (L2-001, L2-002). */
export class LandingPage {
  readonly root: Locator;
  /** The site navigation and its links. */
  readonly nav: Locator;
  readonly navHowItWorks: Locator;
  readonly navIdeas: Locator;
  readonly navSignIn: Locator;
  readonly navStart: Locator;
  /** The hero. */
  readonly hero: Locator;
  readonly heroHeading: Locator;
  readonly heroLead: Locator;
  readonly heroStart: Locator;
  readonly heroNote: Locator;
  /** The hero's preview of a Popkin. */
  readonly preview: Locator;
  readonly previewName: Locator;
  readonly previewQr: Locator;
  /** How it works. */
  readonly how: Locator;
  readonly howHeading: Locator;
  readonly steps: Locator;
  readonly stepHeadings: Locator;
  /** Ideas. */
  readonly ideas: Locator;
  readonly ideasHeading: Locator;
  readonly ideasLead: Locator;
  readonly ideaCards: Locator;
  readonly ideaNames: Locator;
  readonly ideaLengths: Locator;
  /** The comparison with a group chat. */
  readonly comparison: Locator;
  readonly compareHeading: Locator;
  readonly compareLead: Locator;
  readonly compare: Locator;
  readonly compareCaption: Locator;
  readonly compareColumns: Locator;
  readonly compareRows: Locator;
  readonly compareRowHeadings: Locator;
  /** The closing band: it has no ads. */
  readonly noAds: Locator;
  readonly noAdsHeading: Locator;
  readonly noAdsStart: Locator;
  /** Any text on the page that calls Popkin free (ADR 0019). */
  readonly mentionsOfFree: Locator;
  /** The footer. */
  readonly footer: Locator;
  readonly footerNav: Locator;
  readonly footerLinks: Locator;
  readonly footerHowItWorks: Locator;
  readonly footerIdeas: Locator;
  readonly footerSignIn: Locator;
  readonly footerSafety: Locator;
  readonly footerPrivacy: Locator;
  readonly footerHelp: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly header: Locator;
  readonly logo: Locator;
  readonly main: Locator;
  readonly stepList: Locator;
  readonly ideasColumn: Locator;
  readonly ideaGrid: Locator;
  readonly previewCard: Locator;
  readonly heroText: Locator;
  readonly footerLogo: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="landing"]');

    this.header = page.locator('.site-nav');
    this.logo = this.header.getByRole('link', { name: 'popkin' });
    this.nav = page.getByRole('navigation', { name: 'Site' });
    this.navHowItWorks = this.nav.getByRole('link', { name: 'How it works' });
    this.navIdeas = this.nav.getByRole('link', { name: 'Ideas' });
    this.navSignIn = this.nav.getByRole('link', { name: 'Sign in' });
    this.navStart = this.nav.getByRole('link', { name: 'Start a Popkin' });

    this.main = page.getByRole('main');
    this.hero = page.locator('.hero');
    this.heroHeading = page.getByRole('heading', { level: 1 });
    // The heading's parent holds the heading, the paragraph and the action.
    this.heroText = this.heroHeading.locator('..');
    this.heroLead = this.heroText.locator('p');
    this.heroStart = this.hero.getByRole('link', { name: 'Start a Popkin' });
    this.heroNote = this.hero.getByText('Takes about a minute.');
    this.preview = this.hero.locator('.hero__art');
    this.previewCard = this.preview.locator('.hero__card');
    this.previewName = this.preview.getByText('Lakeside Weekend');
    this.previewQr = page.getByRole('img', { name: 'QR code for popk.in/lakeside' });

    this.how = page.locator('#how');
    this.howHeading = page.getByRole('heading', { name: 'Scan. Join. You’re in.' });
    this.stepList = this.how.getByRole('list');
    this.steps = this.stepList.getByRole('listitem');
    this.stepHeadings = this.steps.getByRole('heading');

    this.ideas = page.locator('#ideas');
    this.ideasHeading = page.getByRole('heading', {
      name: 'For every group that forms around a table.',
    });
    this.ideasLead = this.ideas.getByText('Weekly, weekend-long or one-off.');
    // The section's column: the section itself in the mock, the band's container in the app.
    this.ideasColumn = page.locator('.section').filter({ has: this.ideasHeading });
    this.ideaGrid = this.ideas.locator('.uses');
    this.ideaCards = this.ideas.getByRole('article');
    this.ideaNames = this.ideaCards.getByRole('heading');
    this.ideaLengths = this.ideaCards.locator('.use__length');

    this.compareHeading = page.getByRole('heading', { name: 'Better than a group chat.' });
    this.comparison = page.getByRole('region', { name: 'Better than a group chat.' });
    this.compareLead = this.comparison.getByText('A group chat is one long scroll.');
    this.compare = page.getByRole('table', { name: 'A group chat compared with a Popkin' });
    this.compareCaption = this.compare.locator('caption');
    this.compareColumns = this.compare.getByRole('columnheader');
    this.compareRows = this.compare.locator('tbody tr');
    this.compareRowHeadings = this.compare.getByRole('rowheader');

    this.noAds = page.locator('.cta-band');
    this.noAdsHeading = page.getByRole('heading', { name: 'No ads. Like, actually none.' });
    this.noAdsStart = this.noAds.getByRole('link', { name: 'Start a Popkin' });
    this.mentionsOfFree = page.getByText(/\bfree\b/i);

    this.footer = page.getByRole('contentinfo');
    this.footerLogo = this.footer.locator('.logo');
    this.footerNav = page.getByRole('navigation', { name: 'Footer' });
    this.footerLinks = this.footerNav.getByRole('link');
    this.footerHowItWorks = this.footerNav.getByRole('link', { name: 'How it works' });
    this.footerIdeas = this.footerNav.getByRole('link', { name: 'Ideas' });
    this.footerSignIn = this.footerNav.getByRole('link', { name: 'Sign in' });
    this.footerSafety = this.footerNav.getByRole('link', { name: 'Safety' });
    this.footerPrivacy = this.footerNav.getByRole('link', { name: 'Privacy' });
    this.footerHelp = this.footerNav.getByRole('link', { name: 'Help' });
  }

  /** One idea card, by its name: "Hackathon". */
  idea(name: string): Locator {
    return this.ideaCards.filter({ has: this.page.getByRole('heading', { name }) });
  }

  /** One row of the comparison, by its heading: "Joining". */
  compareRow(name: string): Locator {
    return this.compareRows.filter({ has: this.page.getByRole('rowheader', { name }) });
  }

  /** How many idea cards share the first row: 1 on a phone, 4 from 1024 px (L2-001 AC5, AC6). */
  async ideasAcross(): Promise<number> {
    const boxes = await Promise.all((await this.ideaCards.all()).map((card) => card.boundingBox()));
    const top = boxes[0]?.y;
    return boxes.filter((box) => !!box && top !== undefined && Math.abs(box.y - top) < 1).length;
  }

  /** True when the hero's text sits beside the preview, as it does from 1024 px (L2-001 AC6). */
  async heroSideBySide(): Promise<boolean> {
    const text = await this.heroText.boundingBox();
    const preview = await this.preview.boundingBox();
    return !!text && !!preview && preview.x >= text.x + text.width - 1;
  }

  /** True when the document is wider than the viewport (L2-001 AC5). */
  scrollsSideways(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
