import type { Locator, Page } from '@playwright/test';

/** A direct message, `/p/:popkinId/chat/:memberId` (L2-023, L2-030 AC8). */
export class DirectMessagePage {
  readonly root: Locator;
  readonly screen: Locator;
  readonly topBar: Locator;
  readonly back: Locator;
  /** The other member's name, the screen's h1. */
  readonly name: Locator;
  readonly avatar: Locator;
  /** "From 🏕️ Lakeside Weekend". */
  readonly from: Locator;
  /** "Call Walt", at the end of the bar. */
  readonly call: Locator;
  readonly thread: Locator;
  /** "Only you two can see this", with the other member's avatar and name. */
  readonly intro: Locator;
  readonly introName: Locator;
  readonly messages: Locator;
  /** "Say hello to Walt. This is the start of your chat." */
  readonly empty: Locator;
  readonly loading: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  readonly backToChat: Locator;
  readonly composer: Locator;
  readonly field: Locator;
  readonly send: Locator;
  /** What a wrapped-up Popkin says in place of the field (L2-023 AC5). */
  readonly closed: Locator;
  /** The banner of a call under way between the two, and its Join or Return. */
  readonly callBanner: Locator;
  readonly joinCall: Locator;
  readonly nav: Locator;
  /** The list of conversations beside the thread, from 1024 px. */
  readonly listPane: Locator;
  /** The other member, from 1280 px: "About Walt". */
  readonly personPane: Locator;
  readonly personCall: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly titles: Locator;
  readonly skeletonRows: Locator;
  /** The open conversation's row in the list pane. */
  readonly currentRow: Locator;
  readonly personName: Locator;
  readonly personPlace: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="direct-message"]');
    this.screen = page.locator('.screen');
    this.topBar = page.locator('.screen > .topbar');
    this.back = this.topBar.getByRole('link', { name: 'Back' });
    this.name = this.topBar.getByRole('heading', { level: 1 });
    this.avatar = this.topBar.locator('.avatar');
    this.from = this.topBar.locator('.topbar__sub');
    this.call = this.topBar.getByRole('link', { name: /^Call / });
    this.thread = page.getByRole('main');
    this.intro = this.thread.locator('.dm-intro');
    this.introName = this.intro.locator('.dm-intro__name');
    this.messages = this.thread.locator('.msg:not(:has(.skeleton))');
    this.empty = this.thread.locator('.system-note', {
      hasText: 'This is the start of your chat.',
    });
    this.loading = this.thread.getByRole('status').filter({ hasText: 'Loading messages…' });
    this.error = this.thread.getByRole('alert');
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
    this.backToChat = this.error.getByRole('link', { name: 'Back to Chat' });
    this.composer = page.locator('.composer');
    this.field = this.composer.getByRole('textbox');
    this.send = this.composer.getByRole('button', { name: 'Send' });
    this.closed = this.composer.locator('.composer__closed');
    this.callBanner = page.locator('.banner--popkin');
    this.joinCall = this.callBanner.getByRole('link', { name: /^(Join|Return)$/ });
    this.nav = page.getByRole('navigation', { name: 'Popkin' });
    this.listPane = page.getByRole('complementary', { name: 'Chat' });
    this.personPane = page.getByRole('complementary', { name: /^About / });
    // A link in the app, which goes to the call; the mock draws a button.
    this.personCall = this.personPane
      .getByRole('link', { name: /^Call / })
      .or(this.personPane.getByRole('button', { name: /^Call / }));
    this.titles = this.topBar.locator('.topbar__titles');
    this.skeletonRows = this.thread.locator('.stack');
    this.currentRow = this.listPane.locator('.row[aria-current="page"]');
    this.personName = this.personPane.getByRole('heading', { level: 2 });
    this.personPlace = this.personPane.locator('p').first();
  }

  /** The message with this text, not one that only quotes it. */
  message(text: string): Locator {
    return this.messages.filter({ has: this.page.locator('.bubble > p', { hasText: text }) });
  }
}
