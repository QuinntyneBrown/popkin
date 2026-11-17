import type { Locator, Page } from '@playwright/test';

/** A contact's profile, `/contacts/people/:contactId` (L2-128, L2-122 AC2, L2-123). */
export class ContactProfilePage {
  readonly root: Locator;
  readonly main: Locator;
  readonly back: Locator;
  readonly edit: Locator;
  readonly more: Locator;
  /** The header: photo, name, who they are and the actions (`pk-contact-id`). */
  readonly header: Locator;
  readonly name: Locator;
  readonly sub: Locator;
  readonly photo: Locator;
  readonly message: Locator;
  readonly call: Locator;
  readonly email: Locator;
  readonly log: Locator;
  readonly about: Locator;
  readonly facts: Locator;
  readonly loves: Locator;
  /** "Make a habit of seeing {first name}" (L2-128 AC5). */
  readonly makeHabit: Locator;
  /** Our habit's card (L2-128 AC5), and "End this habit" under it (L2-144 AC3). */
  readonly habit: Locator;
  readonly habitOver: Locator;
  readonly habitTitle: Locator;
  readonly habitStrip: Locator;
  readonly habitFoot: Locator;
  readonly endHabit: Locator;
  /** "People around {first name}" (L2-150 AC4). */
  readonly around: Locator;
  readonly keyDates: Locator;
  readonly keyDateRows: Locator;
  readonly addDate: Locator;
  readonly keyDateList: Locator;
  readonly history: Locator;
  readonly historyTabs: Locator;
  /** The history's view nav, for the parity specs. */
  readonly historyNav: Locator;
  readonly addField: Locator;
  readonly addFollowUp: Locator;
  readonly followUps: Locator;
  readonly emptyTimeline: Locator;
  readonly timeline: Locator;
  readonly timelineEntries: Locator;
  readonly timelineFilters: Locator;
  readonly logMilestone: Locator;
  readonly logConversation: Locator;
  readonly memoriesIntro: Locator;
  readonly addMemory: Locator;
  readonly memoryGrid: Locator;
  readonly memoryPhotos: Locator;
  readonly memoryList: Locator;
  readonly memoryRows: Locator;
  readonly memoriesFailed: Locator;
  /** The loading line (L2-123 AC1). */
  readonly loading: Locator;
  /** The failed and not-found states (`pk-empty-state`). */
  readonly state: Locator;
  readonly stateHeading: Locator;
  readonly stateText: Locator;
  readonly tryAgain: Locator;
  readonly goToPeople: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="contact-profile"]');
    this.main = page.locator('.contacts-page');
    this.back = this.main.getByRole('link', { name: 'People', exact: true });
    this.edit = page.getByRole('link', { name: 'Edit profile' });
    this.more = page.getByRole('button', { name: /^More for / });
    this.header = page.locator('.contact-id');
    this.name = this.header.getByRole('heading', { level: 1 });
    this.sub = this.header.locator('.contact-id__sub');
    this.photo = this.header.locator('.avatar img');
    this.message = this.header.getByRole('link', { name: 'Message' });
    this.call = this.header.getByRole('link', { name: 'Call' });
    this.email = this.header.getByRole('link', { name: 'Email' });
    this.log = this.header.getByRole('link', { name: 'Log' });
    this.about = page.getByRole('region', { name: /^About / });
    this.keyDates = page.getByRole('region', { name: 'Key dates' });
    this.keyDateList = this.keyDates.locator('ul.divided');
    this.keyDateRows = this.keyDates.locator('li');
    this.addDate = this.keyDates.getByRole('button', { name: 'Add a date' });
    this.facts = this.about.locator('.contact-facts__item');
    this.loves = this.about.locator('.likes__item');
    this.makeHabit = page.locator('.add-card');
    this.habit = page.locator('.info-card').filter({ has: page.locator('.keep-strip') });
    this.habitOver = this.habit.locator('.info-card__over');
    this.habitTitle = this.habit.locator('.info-card__title');
    this.habitStrip = this.habit.locator('.keep-strip');
    this.habitFoot = this.habit.locator('.info-card__foot');
    this.endHabit = page.getByRole('button', { name: 'End this habit' });
    this.around = page.getByRole('region', { name: /^People around / });
    this.history = page.getByRole('navigation', { name: /’s history$/ });
    this.historyNav = page.locator('nav.view-nav');
    this.addField = page.locator('.add-field');
    this.historyTabs = this.history.getByRole('link');
    this.addFollowUp = page.getByRole('textbox', { name: /^Add a follow-up for / });
    this.followUps = page.locator('li.task');
    this.emptyTimeline = page.getByRole('heading', { name: /^Nothing logged with / });
    this.timeline = page.locator('ol.contact-timeline');
    this.timelineEntries = this.timeline.locator('li.contact-timeline__item');
    this.timelineFilters = page.getByRole('group', { name: 'Show' });
    this.logMilestone = page.getByRole('link', { name: 'Milestone', exact: true });
    this.logConversation = page.getByRole('link', { name: 'Conversation', exact: true });
    this.memoriesIntro = page.getByText(/Photos, files and notes you’ve kept about /);
    this.addMemory = page.getByRole('button', { name: 'Add', exact: true });
    this.memoryGrid = page.locator('.memory-grid');
    this.memoryPhotos = this.memoryGrid.locator('figcaption');
    this.memoryList = page.locator('ul.memory-list');
    this.memoryRows = this.memoryList.locator('li');
    this.memoriesFailed = page.getByRole('heading', { name: /^We couldn’t load .*’s memories$/ });
    this.loading = page.getByRole('status').filter({ hasText: /^Loading / });
    this.state = page.locator('.contacts-page :is([role="alert"] .empty, .empty[role="alert"])');
    this.stateHeading = this.state.getByRole('heading');
    this.stateText = this.state.locator('.empty__text');
    this.tryAgain = this.state.getByRole('button', { name: 'Try again' });
    this.goToPeople = this.state.getByRole('link', { name: 'Go to People' });
  }

  fact(label: string): Locator {
    return this.facts
      .filter({ has: this.about.page().getByText(label, { exact: true }) })
      .locator('dd');
  }

  timelineFilter(name: 'All' | 'Conversations' | 'Milestones'): Locator {
    return this.timelineFilters.getByRole('button', { name });
  }
}
