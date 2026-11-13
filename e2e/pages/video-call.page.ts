import type { Locator, Page } from '@playwright/test';

/** One person's tile on the stage. */
export class CallTile {
  readonly name: Locator;
  readonly video: Locator;
  readonly avatar: Locator;
  readonly mutedIcon: Locator;

  constructor(readonly root: Locator) {
    this.name = root.locator('.call-tile__name');
    this.video = root.locator('.call-tile__video');
    this.avatar = root.locator('.avatar');
    this.mutedIcon = this.name.locator('svg');
  }
}

/** A group call, `/p/:popkin/call` (L2-029, L2-030). */
export class VideoCallPage {
  readonly root: Locator;
  readonly topBar: Locator;
  readonly heading: Locator;
  readonly sub: Locator;
  readonly minimise: Locator;
  readonly invite: Locator;
  /** The tiles: a list, named "On the call" where others are on it. */
  readonly grid: Locator;
  /** The tiles of people; the one that counts the rest is `rest`. */
  readonly tiles: Locator;
  readonly names: Locator;
  readonly videos: Locator;
  readonly speaking: Locator;
  /** The tile that counts the people who are not shown. */
  readonly rest: Locator;
  readonly controls: Locator;
  readonly mute: Locator;
  readonly camera: Locator;
  readonly leave: Locator;
  /** What the stage says in place of the tiles, or under the member's own. */
  readonly message: Locator;
  readonly messageHeading: Locator;
  readonly joining: Locator;
  readonly failure: Locator;
  readonly tryAgain: Locator;
  readonly backToThePopkin: Locator;
  readonly inviteToCall: Locator;
  /** The pane that lists who is on the call, from 1280 px. */
  readonly aside: Locator;
  readonly people: Locator;
  readonly asideNote: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly main: Locator;
  readonly titles: Locator;
  readonly pictures: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('.screen--stage');
    this.topBar = this.root.locator('.topbar');
    this.heading = this.topBar.getByRole('heading', { level: 1 });
    this.sub = this.topBar.locator('.topbar__sub');
    this.minimise = this.topBar.getByRole('link', { name: 'Minimise call' });
    this.invite = this.topBar.locator('.icon-btn--labelled');
    this.grid = page.locator('ul.call-grid');
    this.tiles = this.grid.locator('.call-tile:not(.call-tile--rest)');
    this.names = this.tiles.locator('.call-tile__name');
    this.videos = this.grid.locator('.call-tile__video');
    this.speaking = this.grid.locator('.call-tile--speaking');
    this.rest = this.grid.locator('.call-tile--rest');
    this.controls = page.locator('.call-controls');
    this.mute = this.controls.getByRole('button', { name: /^(Mute|Unmute)$/ });
    this.camera = this.controls.getByRole('button', { name: /^Camera/ });
    this.leave = this.controls.getByRole('button', { name: 'Leave call' });
    this.message = page.locator('.stage-message');
    this.messageHeading = this.message.getByRole('heading', { level: 2 });
    this.joining = this.root.locator('.stage-message[role="status"]');
    this.failure = this.root.getByRole('alert');
    this.tryAgain = this.message.locator('.btn--on-accent');
    this.backToThePopkin = this.message.locator('.btn--secondary');
    this.inviteToCall = this.message.locator('.btn--on-accent');
    this.aside = page.locator('.call-aside');
    this.people = this.aside.getByRole('listitem');
    this.asideNote = this.aside.locator('p');
    this.main = page.locator('#main');
    this.titles = this.topBar.locator('.topbar__titles');
    this.pictures = page.locator('.call-tile__video');
  }

  /** The tile of the person with this first name, or "You". */
  tile(name: string): Locator {
    return this.tiles.filter({
      has: this.page.locator('.call-tile__name', { hasText: name }),
    });
  }

  /** The tile of that person, with its parts. */
  person(name: string): CallTile {
    return new CallTile(this.tile(name));
  }

  /** The row of the pane for the person with this full name. */
  row(name: string): Locator {
    return this.people.filter({ hasText: name });
  }

  /** How many tiles sit side by side in the first row. */
  async across(): Promise<number> {
    const tops = await this.grid
      .locator('.call-tile')
      .evaluateAll((tiles) => tiles.map((tile) => Math.round(tile.getBoundingClientRect().top)));
    return tops.filter((top) => top === tops[0]).length;
  }

  /** Whether every tile is as wide and as tall as the first. */
  async tilesAreEqual(): Promise<boolean> {
    const sizes = await this.grid.locator('.call-tile').evaluateAll((tiles) =>
      tiles.map((tile) => {
        const box = tile.getBoundingClientRect();
        return `${Math.round(box.width)}x${Math.round(box.height)}`;
      }),
    );
    return sizes.every((size) => size === sizes[0]);
  }

  /** The width of the ring round whoever is speaking, in pixels. */
  ringWidth(): Promise<number> {
    return this.speaking.first().evaluate((tile) => {
      const style = getComputedStyle(tile);
      const lengths = style.boxShadow.replace(/rgba?\([^)]*\)/g, '').match(/-?[\d.]+px/g) ?? [];
      const spread = lengths.length >= 4 ? parseFloat(lengths[3]) : 0;
      const outline = style.outlineStyle === 'none' ? 0 : parseFloat(style.outlineWidth) || 0;
      const border = parseFloat(style.borderTopWidth) || 0;
      return Math.max(spread, outline, border);
    });
  }

  /** Whether a tile's picture is playing: frames have arrived and it is not paused. */
  isPlaying(tile: CallTile): Promise<boolean> {
    return tile.video.evaluate(
      (video) => video instanceof HTMLVideoElement && video.readyState >= 2 && !video.paused,
    );
  }

  /** Nothing is wider than the screen, so the page never scrolls sideways. */
  fitsTheScreen(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
  }

  /**
   * Takes what the cameras show out of the picture, in the mock and in the app alike: the mock
   * draws photographs where the app plays streams, and no two cameras show the same.
   */
  async withoutPictures(): Promise<void> {
    await this.pictures.evaluateAll((pictures: HTMLElement[]) => {
      for (const picture of pictures) picture.style.visibility = 'hidden';
    });
  }
}
