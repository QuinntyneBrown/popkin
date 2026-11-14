import type { Locator, Page } from '@playwright/test';

/** The marketing site's one page, `about.popkin.community/` (L2-079 to L2-081, ADR 0017). */
export class MarketingHomePage {
  readonly root: Locator;
  /** The site navigation and its links. */
  readonly header: Locator;
  readonly logo: Locator;
  readonly nav: Locator;
  readonly navHowItWorks: Locator;
  readonly navIdeas: Locator;
  readonly navSignIn: Locator;
  readonly navStart: Locator;
  readonly main: Locator;
  /** Every section heading of the page, in order. */
  readonly sectionHeadings: Locator;
  /** The hero. */
  readonly hero: Locator;
  readonly heroHeading: Locator;
  readonly heroText: Locator;
  readonly heroLead: Locator;
  readonly heroStart: Locator;
  readonly heroFilm: Locator;
  readonly heroFree: Locator;
  readonly preview: Locator;
  readonly previewQr: Locator;
  /** "See Popkin in action." and the film. */
  readonly filmSection: Locator;
  readonly filmHeading: Locator;
  readonly film: Locator;
  readonly filmVideo: Locator;
  readonly filmPlay: Locator;
  readonly filmLength: Locator;
  readonly filmChapters: Locator;
  /** How it works. */
  readonly howHeading: Locator;
  readonly stepHeadings: Locator;
  /** Ideas. */
  readonly ideas: Locator;
  readonly ideasHeading: Locator;
  readonly ideaCards: Locator;
  readonly ideaNames: Locator;
  /** The comparison with a group chat. */
  readonly compareHeading: Locator;
  readonly compareRowHeadings: Locator;
  /** The closing band. */
  readonly free: Locator;
  readonly freeHeading: Locator;
  readonly freeStart: Locator;
  /** The footer. */
  readonly footer: Locator;
  readonly footerBlurb: Locator;
  readonly footerLinks: Locator;
  readonly footerLegal: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="marketing-home"]');

    this.header = page.locator('.site-nav');
    this.logo = this.header.getByRole('link', { name: 'popkin', exact: true });
    this.nav = page.getByRole('navigation', { name: 'Site' });
    this.navHowItWorks = this.nav.getByRole('link', { name: 'How it works' });
    this.navIdeas = this.nav.getByRole('link', { name: 'Ideas' });
    this.navSignIn = this.nav.getByRole('link', { name: 'Sign in' });
    this.navStart = this.nav.getByRole('link', { name: 'Start a Popkin' });

    this.main = page.getByRole('main');
    this.sectionHeadings = this.main.getByRole('heading', { level: 2 });

    this.hero = page.locator('.hero');
    this.heroHeading = page.getByRole('heading', { level: 1 });
    this.heroText = this.heroHeading.locator('..');
    this.heroLead = this.heroText.locator('p').first();
    this.heroStart = this.hero.getByRole('link', { name: 'Start a Popkin' });
    this.heroFilm = this.hero.getByRole('link', { name: 'Watch the film' });
    this.heroFree = this.hero.getByText('Free. Takes about a minute.');
    this.preview = this.hero.locator('.hero__art');
    this.previewQr = page.getByRole('img', { name: 'QR code for popk.in/lakeside' });

    this.filmSection = page.locator('#film');
    this.filmHeading = page.getByRole('heading', { name: 'See Popkin in action.' });
    this.film = page.locator('.film');
    this.filmVideo = this.film.locator('video');
    this.filmPlay = this.film.getByRole('button', { name: 'Play the Popkin film' });
    this.filmLength = this.film.locator('.film__length');
    this.filmChapters = page.getByRole('list', { name: 'Chapters' }).getByRole('button');

    this.howHeading = page.getByRole('heading', { name: 'Scan. Join. You’re in.' });
    this.stepHeadings = page.locator('#how').getByRole('listitem').getByRole('heading');

    this.ideas = page.locator('#ideas');
    this.ideasHeading = page.getByRole('heading', {
      name: 'For every group that forms around a table.',
    });
    this.ideaCards = this.ideas.getByRole('article');
    this.ideaNames = this.ideaCards.getByRole('heading');

    this.compareHeading = page.getByRole('heading', { name: 'Better than a group chat.' });
    this.compareRowHeadings = page
      .getByRole('table', { name: 'A group chat compared with a Popkin' })
      .getByRole('rowheader');

    this.free = page.locator('.cta-band');
    this.freeHeading = page.getByRole('heading', { name: 'Free. Like, actually free.' });
    this.freeStart = this.free.getByRole('link', { name: 'Start a Popkin' });

    this.footer = page.getByRole('contentinfo');
    this.footerBlurb = this.footer.getByText('Pop-up communities for small groups.');
    this.footerLinks = page.getByRole('navigation', { name: 'Footer' }).getByRole('link');
    this.footerLegal = this.footer.getByText('© 2026 Popkin');
  }

  /** A link of the footer, by its name: "Sign in". */
  footerLink(name: string): Locator {
    return this.footerLinks.filter({ hasText: name });
  }

  /** One chapter of the film, by its title: "Meet Popkin". */
  chapter(title: string): Locator {
    return this.filmChapters.filter({ hasText: title });
  }

  /** Where the film is, in seconds. */
  filmTime(): Promise<number> {
    return this.filmVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  }

  /** How many idea cards share the first row. */
  async ideasAcross(): Promise<number> {
    const boxes = await Promise.all((await this.ideaCards.all()).map((card) => card.boundingBox()));
    const top = boxes[0]?.y;
    return boxes.filter((box) => !!box && top !== undefined && Math.abs(box.y - top) < 1).length;
  }

  /** True when the hero's text sits beside the preview. */
  async heroSideBySide(): Promise<boolean> {
    const text = await this.heroText.boundingBox();
    const preview = await this.preview.boundingBox();
    return !!text && !!preview && preview.x >= text.x + text.width - 1;
  }

  /** True when the document is wider than the viewport. */
  scrollsSideways(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
