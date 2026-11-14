import type { Locator, Page } from '@playwright/test';

/** The Everyone thread, `/p/:popkinId/chat/everyone` (L2-021, L2-027, L2-028). */
export class GroupChatPage {
  readonly root: Locator;
  readonly screen: Locator;
  readonly topBar: Locator;
  readonly back: Locator;
  readonly heading: Locator;
  readonly tile: Locator;
  readonly sub: Locator;
  readonly thread: Locator;
  readonly rows: Locator;
  readonly messages: Locator;
  readonly dayDividers: Locator;
  readonly notes: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly empty: Locator;
  readonly emptyHeading: Locator;
  readonly openers: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  readonly backToChat: Locator;
  readonly composer: Locator;
  /** What a wrapped-up Popkin says in place of the field (L2-045 AC1). */
  readonly closed: Locator;
  readonly backToRecap: Locator;
  readonly startCall: Locator;
  readonly field: Locator;
  readonly send: Locator;
  readonly count: Locator;
  readonly newMessages: Locator;
  readonly announcements: Locator;
  readonly banner: Locator;
  readonly startGroupCall: Locator;
  readonly nav: Locator;
  readonly tabs: Locator;
  readonly currentTab: Locator;
  readonly chatTab: Locator;
  readonly unreadBadge: Locator;
  readonly unreadCount: Locator;
  readonly listPane: Locator;
  readonly everyoneCard: Locator;
  readonly detailPane: Locator;
  readonly hereNow: Locator;
  readonly others: Locator;
  readonly toast: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly titles: Locator;
  readonly skeletonRows: Locator;
  readonly navBadge: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="group-chat"]');
    this.screen = page.locator('.screen');
    this.topBar = page.locator('.screen > .topbar');
    this.back = this.topBar.getByRole('link', { name: 'Back' });
    this.heading = page.getByRole('heading', { level: 1 });
    this.tile = this.topBar.locator('.popkin-tile');
    this.sub = this.topBar.locator('.topbar__sub');
    this.thread = page.getByRole('main');
    this.rows = this.thread.locator('.msg, .day-divider, .system-note');
    this.messages = this.thread.locator('.msg:not(:has(.skeleton))');
    this.dayDividers = this.thread.locator('.day-divider');
    this.notes = this.thread.locator('.system-note');
    this.loading = this.thread.getByRole('status').filter({ hasText: 'Loading messages…' });
    this.skeletons = this.thread.locator('.skeleton');
    this.empty = this.thread.locator('.empty');
    this.emptyHeading = this.empty.getByRole('heading');
    this.openers = this.empty.locator('.chip');
    this.error = this.thread.getByRole('alert');
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
    this.backToChat = this.error.getByRole('link', { name: 'Back to Chat' });
    this.composer = page.locator('.composer');
    this.field = this.composer.getByRole('textbox');
    this.send = this.composer.getByRole('button', { name: 'Send' });
    this.closed = this.composer.locator('.composer__closed');
    this.backToRecap = this.topBar.getByRole('link', { name: 'Recap' });
    this.startCall = this.topBar.getByRole('link', { name: 'Start group call' });
    this.count = this.composer.locator('.composer__count');
    this.newMessages = page.getByRole('button', { name: 'New messages' });
    this.announcements = page.locator(
      '[aria-live="polite"].visually-hidden, .visually-hidden[aria-live="polite"]',
    );
    this.banner = page.locator('.banner');
    this.startGroupCall = page.locator('.topbar').getByRole('link', { name: 'Start group call' });
    this.nav = page.getByRole('navigation', { name: 'Popkin' });
    this.tabs = this.nav.locator('ul a');
    this.currentTab = this.nav.locator('ul a[aria-current="page"]');
    this.chatTab = this.nav.getByRole('link', { name: /^Chat/ });
    this.unreadBadge = this.nav.locator('.badge');
    this.unreadCount = this.unreadBadge.locator('[aria-hidden="true"]');
    this.listPane = page.getByRole('complementary', { name: 'Chat' });
    this.everyoneCard = this.listPane.locator('.card');
    this.detailPane = page.getByRole('complementary', { name: 'About this Popkin' });
    this.hereNow = this.detailPane.locator('li .row__title');
    this.others = this.detailPane.locator('.detail-pane__more');
    this.toast = page.locator('.toast');
    this.titles = this.topBar.locator('.topbar__titles');
    this.skeletonRows = this.thread.locator('.stack');
    this.navBadge = this.nav.locator('.badge');
  }

  /** The message with this text, not one that only quotes it. */
  message(text: string): Locator {
    return this.messages.filter({ has: this.page.locator('.bubble > p', { hasText: text }) });
  }

  nameOf(message: Locator): Locator {
    return message.locator('.msg__name');
  }

  avatarOf(message: Locator): Locator {
    return message.locator('.avatar');
  }

  timeOf(message: Locator): Locator {
    return message.locator('.msg__time');
  }

  statusOf(message: Locator): Locator {
    return message.locator('.msg__status');
  }

  tryAgainOn(message: Locator): Locator {
    return message.getByRole('button', { name: 'Try again' });
  }

  deleteOn(message: Locator): Locator {
    return message.getByRole('button', { name: 'Delete' });
  }

  /** The text of every bubble, in the order shown. */
  texts(): Locator {
    return this.messages.locator('.bubble > p');
  }

  /** True when the bubble sits against the right edge of its row, as the member's own do. */
  async isOnTheRight(message: Locator): Promise<boolean> {
    const bubble = await message.locator('.bubble').boundingBox();
    const row = await message.boundingBox();
    if (!bubble || !row) return false;
    return row.x + row.width - (bubble.x + bubble.width) < 1;
  }

  /** Scrolls the page to the top of the thread, as a member reading back does. */
  async readBack(): Promise<void> {
    await this.page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          window.scrollTo({ top: 0, behavior: 'instant' });
          // Two frames: the page learns from the browser that the latest is out of view.
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
  }

  /** How far down the page a message is, to see that it did not move. */
  async placeOf(message: Locator): Promise<number> {
    const box = await message.boundingBox();
    return Math.round(box?.y ?? Number.NaN);
  }

  async type(text: string): Promise<void> {
    await this.field.fill(text);
  }

  async sendWithEnter(text: string): Promise<void> {
    await this.field.fill(text);
    await this.field.press('Enter');
  }
}
