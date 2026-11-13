import type { Locator, Page } from '@playwright/test';

/** The home of a Popkin, `/p/:popkinId` (L2-019, L2-044 AC5, L2-027 AC3). */
export class PopkinHomePage {
  readonly root: Locator;
  readonly screen: Locator;
  readonly header: Locator;
  readonly heading: Locator;
  readonly tile: Locator;
  readonly avatars: Locator;
  readonly moreAvatars: Locator;
  readonly memberCount: Locator;
  readonly timeLeft: Locator;
  readonly myPopkins: Locator;
  readonly actions: Locator;
  readonly groupCall: Locator;
  readonly invite: Locator;
  /** "Popkin settings": the one of the two the width shows. */
  readonly settings: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly main: Locator;
  readonly side: Locator;
  /** The Chat card, or the card that stands for it while nobody has written. */
  readonly chat: Locator;
  readonly chatCard: Locator;
  readonly chatLines: Locator;
  readonly newCount: Locator;
  readonly invitePeople: Locator;
  readonly sayHello: Locator;
  readonly photos: Locator;
  readonly thumbnails: Locator;
  readonly addTheFirstPhoto: Locator;
  readonly experiences: Locator;
  readonly experienceCards: Locator;
  readonly shareOne: Locator;
  readonly members: Locator;
  readonly memberRows: Locator;
  readonly memberNames: Locator;
  readonly hostLabel: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  readonly toMyPopkins: Locator;
  readonly nav: Locator;
  readonly tabs: Locator;
  readonly currentTab: Locator;
  readonly chatTab: Locator;
  readonly unreadCount: Locator;
  readonly sidebarTimeLeft: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly identity: Locator;
  readonly inviteRegion: Locator;
  readonly stack: Locator;
  readonly bodySkeleton: Locator;
  /** The banner of a call that is under way: how many are on it, and Join. */
  readonly callBanner: Locator;
  readonly photoStrip: Locator;
  readonly memberList: Locator;
  readonly firstExperience: Locator;
  readonly firstRating: Locator;
  readonly photosCard: Locator;
  readonly chatEmpty: Locator;
  readonly photosEmpty: Locator;
  readonly photosFailure: Locator;
  readonly photosHead: Locator;
  readonly membersHead: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="popkin-home"]');
    this.screen = page.locator('.screen');
    this.header = page.locator('.home-header');
    this.heading = page.getByRole('heading', { level: 1 });
    this.tile = this.header.locator('.popkin-tile');
    this.avatars = this.header.locator('.home-header__members .avatar');
    this.moreAvatars = this.header.locator('.avatar-stack__more');
    this.memberCount = this.header.locator('.home-header__members > span:last-child');
    this.timeLeft = this.header.locator('.time-left');
    this.myPopkins = this.header.getByRole('link', { name: 'My Popkins' });
    this.actions = this.header.locator('.home-header__actions');
    this.groupCall = this.header.getByRole('link', { name: 'Group call' });
    this.invite = this.header.getByRole('button', { name: 'Invite', exact: true });
    this.settings = this.header
      .getByRole('button', { name: 'Popkin settings' })
      .filter({ visible: true });
    this.loading = page.getByRole('status').filter({ hasText: 'Loading this Popkin…' });
    this.skeletons = page.locator('.skeleton');
    this.main = page.locator('.home__main');
    this.side = page.locator('.home__side');
    this.chat = this.main.locator('section').first();
    this.chatCard = this.chat.getByRole('link', { name: /^Chat/ });
    this.chatLines = this.chat.locator('.chat-preview');
    this.newCount = this.chat.locator('.badge');
    this.invitePeople = this.chat.getByRole('button', { name: 'Invite people' });
    this.sayHello = this.chat.getByRole('link', { name: 'Say hello' });
    this.photos = this.section('Photos');
    this.thumbnails = this.photos.locator('a.thumb');
    this.addTheFirstPhoto = this.photos.getByRole('link', { name: 'Add the first photo' });
    this.experiences = this.section('Experiences');
    this.experienceCards = this.experiences.locator('a.card');
    this.shareOne = this.experiences.getByRole('link', { name: 'Share one' });
    this.members = this.section('Members');
    this.memberRows = this.members.getByRole('listitem');
    this.memberNames = this.members.locator('.row__main');
    this.hostLabel = this.memberRows.first().locator('.row__role');
    this.error = page.getByRole('alert');
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
    this.toMyPopkins = this.error.getByRole('link', { name: 'My Popkins' });
    this.nav = page.getByRole('navigation', { name: 'Popkin' });
    this.tabs = this.nav.locator('ul a > span:not(.badge)');
    this.currentTab = this.nav.locator('ul a[aria-current="page"]');
    this.chatTab = this.nav.getByRole('link', { name: /^Chat/ });
    this.unreadCount = this.nav.locator('.badge [aria-hidden="true"]');
    this.sidebarTimeLeft = this.nav.locator('.time-left');
    this.identity = this.header.locator('.home-header__id');
    this.inviteRegion = this.actions.locator('.btn--secondary');
    this.stack = this.header.locator('.avatar-stack');
    this.bodySkeleton = page.locator('main > [aria-hidden="true"]');
    this.callBanner = page.locator('.banner--popkin');
    this.photoStrip = this.photos.locator('.hscroll');
    this.memberList = this.members.getByRole('list');
    this.firstExperience = this.experienceCards.first();
    this.firstRating = this.firstExperience.locator('.rating');
    this.photosCard = this.photos.locator('.card');
    this.chatEmpty = this.chat.locator('.empty');
    this.photosEmpty = this.photos.locator('.empty');
    this.photosFailure = this.photos.locator('.alert');
    this.photosHead = this.photos.locator('.section-head');
    this.membersHead = this.members.locator('.section-head');
  }

  /** The section with this heading. */
  section(name: string): Locator {
    return this.page
      .locator('section')
      .filter({ has: this.page.getByRole('heading', { level: 2, name: new RegExp(`^${name}`) }) });
  }

  /** What a section's heading says after its name: "48 photos", "4 shared", "14". */
  meta(section: Locator): Locator {
    return section.locator('.section-head__meta');
  }

  seeAll(section: Locator): Locator {
    return section.getByRole('link', { name: /^See all/ });
  }

  /** The sender, the time and the line of one row of the Chat card. */
  nameOf(line: Locator): Locator {
    return line.locator('.chat-preview__name');
  }

  timeOf(line: Locator): Locator {
    return line.locator('.chat-preview__time');
  }

  textOf(line: Locator): Locator {
    return line.locator('.chat-preview__text');
  }

  ratingOf(card: Locator): Locator {
    return card.locator('.rating');
  }

  titleOf(card: Locator): Locator {
    return card.locator('.row__title');
  }

  /** The failure a section shows in place of its content. */
  failureOf(section: Locator): Locator {
    return section.getByRole('alert');
  }

  tryAgainIn(section: Locator): Locator {
    return section.getByRole('button', { name: 'Try again' });
  }

  /** The columns of the home, by where their left edges are. */
  async columns(): Promise<number> {
    const [main, side] = await Promise.all([this.main.boundingBox(), this.side.boundingBox()]);
    return main && side && Math.abs(main.x - side.x) > 1 ? 2 : 1;
  }

  /** A tab of the Popkin, by its name. */
  tab(name: 'Home' | 'Chat' | 'Photos' | 'Experiences'): Locator {
    return this.nav.getByRole('link', { name: new RegExp(`^${name}`) });
  }
}
