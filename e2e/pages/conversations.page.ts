import type { Locator, Page } from '@playwright/test';

/** One direct message in the list of conversations: the other member's row. */
export interface ConversationRow {
  root: Locator;
  name: Locator;
  latest: Locator;
  time: Locator;
  /** The dot named "Unread" (L2-022 AC3). */
  unreadDot: Locator;
}

/** The Chat tab, `/p/:popkinId/chat`: Everyone, then the direct messages (L2-022). */
export class ConversationsPage {
  readonly root: Locator;
  readonly screen: Locator;
  readonly topBar: Locator;
  readonly heading: Locator;
  readonly newMessage: Locator;
  readonly list: Locator;
  readonly everyone: Locator;
  readonly everyoneLatest: Locator;
  readonly everyoneTime: Locator;
  /** The badge that counts Everyone's unread messages: "3 unread messages". */
  readonly everyoneUnread: Locator;
  readonly directLabel: Locator;
  readonly rows: Locator;
  readonly empty: Locator;
  readonly emptyNewMessage: Locator;
  readonly loading: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  /** The Everyone thread beside the list, from 1024 px (L2-058 AC11). */
  readonly threadPane: Locator;
  readonly nav: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly directList: Locator;
  readonly skeletons: Locator;
  readonly threadPaneHead: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="conversations"]');
    this.screen = page.locator('.screen');
    this.topBar = page.locator('.screen > .topbar');
    this.heading = page.getByRole('heading', { level: 1, name: 'Chat' });
    this.newMessage = this.topBar.getByRole('button', { name: 'New message' });
    this.list = page.getByRole('main');
    this.everyone = this.list.locator('.card');
    this.everyoneLatest = this.everyone.locator('.row__text');
    this.everyoneTime = this.everyone.locator('.text-accent, .card__time');
    this.everyoneUnread = this.everyone.locator('.badge');
    this.directLabel = this.list.getByRole('heading', { name: 'Direct messages' });
    this.rows = this.list.locator('li > .row');
    this.empty = this.list.locator('.empty');
    this.emptyNewMessage = this.empty.getByRole('button', { name: 'New message' });
    this.loading = this.list.getByRole('status').filter({ hasText: 'Loading your chats…' });
    this.error = this.list.getByRole('alert');
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
    this.threadPane = page.getByRole('region', { name: 'Everyone' });
    this.nav = page.getByRole('navigation', { name: 'Popkin' });
    this.directList = this.list.locator('ul');
    this.skeletons = this.list.locator('[aria-hidden="true"]:has(.skeleton)').first();
    this.threadPaneHead = this.threadPane.locator('.topbar');
  }

  /** The row of the direct message with this member. */
  row(name: string): ConversationRow {
    const root = this.rows.filter({
      has: this.page.locator('.row__title', { hasText: name }),
    });
    return {
      root,
      name: root.locator('.row__title'),
      latest: root.locator('.row__text'),
      time: root.locator('.row__meta'),
      unreadDot: root.getByRole('img', { name: 'Unread' }),
    };
  }
}
