import type { Locator, Page } from '@playwright/test';
import { ContactsNav } from './contacts-nav';

/** Groups, `/contacts/groups` and an open group, `/contacts/groups/{id}` (L2-146 to L2-148). */
export class ContactsGroupsPage {
  readonly root: Locator;
  readonly nav: ContactsNav;
  readonly heading: Locator;
  readonly sub: Locator;
  readonly connections: Locator;
  readonly newGroup: Locator;
  /** The list of groups by kind. */
  readonly list: Locator;
  readonly kinds: Locator;
  readonly items: Locator;
  readonly current: Locator;
  /** The open group. */
  readonly detail: Locator;
  readonly back: Locator;
  readonly over: Locator;
  readonly name: Locator;
  readonly openPopkin: Locator;
  readonly startPopkin: Locator;
  readonly addPeople: Locator;
  readonly peopleHeading: Locator;
  readonly members: Locator;
  readonly memberList: Locator;
  readonly comingUpList: Locator;
  readonly note: Locator;
  readonly comingUp: Locator;
  readonly loading: Locator;
  /** The empty and failed states. */
  readonly state: Locator;
  readonly stateHeading: Locator;
  readonly stateText: Locator;
  readonly tryAgain: Locator;
  readonly stateNewGroup: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly pageHead: Locator;
  readonly browser: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="contacts-groups"]');
    this.nav = new ContactsNav(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.pageHead = page.locator('.page-head');
    this.sub = this.pageHead.locator('.page-head__sub');
    this.connections = this.pageHead.getByRole('link', { name: 'Connections' });
    this.newGroup = this.pageHead.getByRole('button', { name: 'New group' });
    this.browser = page.locator('.group-browser');
    this.list = page.getByRole('navigation', { name: 'Your groups' });
    this.kinds = this.list.locator('.group-browser__kind');
    this.items = this.list.locator('.group-browser__item');
    this.current = this.list.locator('[aria-current="true"]');
    this.detail = page.locator('.group-browser__detail');
    this.back = this.detail.locator('.group-browser__back');
    this.over = this.detail.locator('.group-browser__over');
    this.name = this.detail.locator('.group-browser__name');
    this.openPopkin = this.detail.getByRole('link', { name: /^Open “/ });
    this.startPopkin = this.detail.getByRole('link', { name: 'Start a Popkin with them' });
    this.addPeople = this.detail.getByRole('button', { name: 'Add people' });
    this.peopleHeading = this.detail.locator('#g-people');
    this.memberList = this.detail.locator('section[aria-labelledby="g-people"] ul.divided');
    this.members = this.memberList.locator('li > a.row');
    this.note = this.detail.locator('.info-card__line');
    this.comingUpList = this.detail.locator('section[aria-labelledby="g-coming"] ul');
    this.comingUp = this.comingUpList.locator('li');
    this.loading = page.getByRole('status').filter({ hasText: 'Loading your groups…' });
    this.state = page.locator('.empty');
    this.stateHeading = this.state.getByRole('heading', { level: 2 });
    this.stateText = this.state.locator('p');
    this.tryAgain = this.state.getByRole('button', { name: 'Try again' });
    this.stateNewGroup = this.state.getByRole('button', { name: 'New group' });
  }

  item(name: string): Locator {
    return this.items.filter({ hasText: name });
  }
}
