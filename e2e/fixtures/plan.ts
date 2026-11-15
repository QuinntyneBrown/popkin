import type { Page, Route } from '@playwright/test';
import { people, popkinId } from './chat';
import { sam } from './experiences';
import { maraAtHome, type Home } from './home';
import { Schedule, priya, theSix } from './schedule';
import { problem } from './stubs';
import { NewStoryDialog } from '../pages/new-story.dialog';
import { StoryDialog } from '../pages/story.dialog';
import { PlanBoardPage } from '../pages/plan-board.page';

/**
 * The Plan of Cabin Week ’27 as the mocks draw it, answered in memory (ADR 0005): fourteen
 * stories over Backlog, To do, Doing and Done, and the sprint "Aug 30 – Sep 26", which a spec
 * can hold, fail or change.
 */
export const planUrl = `/p/${popkinId}/plan`;
export const burnDownUrl = `${planUrl}/burn-down`;

/** Saturday 12 September 2026 at noon on the device: day 13 of the mocks' sprint. */
export const planNow = new Date(2026, 8, 12, 12, 0);

export type Column = 'Backlog' | 'ToDo' | 'Doing' | 'Done';
export type Tag = 'Travel' | 'Stay' | 'Food' | 'Money' | 'Fun';

export interface PlanStory {
  id: string;
  title: string;
  column: Column;
  points: number;
  tag: Tag;
  ownerMembershipId: string | null;
  dueDate: string | null;
  addedByMembershipId: string;
  addedAt: string;
}

type Failure = 'server' | 'not-found' | 'off';

const { mara, walt, dev, ellie } = people;

let next = 0;
/** A story of the mocks, added by Mara unless said otherwise. */
export function story(
  title: string,
  column: Column,
  points: number,
  tag: Tag,
  owner: { membershipId: string } | null = null,
  more: Partial<PlanStory> = {},
): PlanStory {
  next++;
  return {
    id: `00000000-0000-4000-8000-story${String(next).padStart(7, '0')}`,
    title,
    column,
    points,
    tag,
    ownerMembershipId: owner?.membershipId ?? null,
    dueDate: null,
    addedByMembershipId: mara.membershipId,
    addedAt: new Date(2026, 7, 30, 9, next).toISOString(),
    ...more,
  };
}

/** The fourteen stories of the mocks' board, in the order their columns list them. */
export function theMocksStories(): PlanStory[] {
  return [
    story('Kayak rental for two days', 'Backlog', 3, 'Fun'),
    story('Rainy-day backup plan', 'Backlog', 2, 'Fun'),
    story('Cabin playlist', 'Backlog', 1, 'Fun'),
    story('Rent a 7-seat van', 'ToDo', 5, 'Travel', walt, { dueDate: '2026-09-21' }),
    story('Grocery list for three dinners', 'ToDo', 3, 'Food', ellie),
    story('Shared sheet to split costs', 'ToDo', 2, 'Money', priya),
    story('Check fishing licence rules', 'ToDo', 1, 'Fun', sam),
    story('Book the cabin at Pine Hollow', 'Doing', 8, 'Stay', mara, { dueDate: '2026-09-18' }),
    story('Everyone confirms the week off', 'Doing', 3, 'Travel', dev, {
      addedByMembershipId: dev.membershipId,
    }),
    story('Pick a place for Friday dinner', 'Doing', 2, 'Food', sam),
    story('Collect $150 deposits', 'Done', 5, 'Money', priya),
    story('Choose the lake', 'Done', 3, 'Stay', mara),
    story('Agree a budget: $450 each', 'Done', 2, 'Money', priya),
    story('Start the Popkin', 'Done', 1, 'Fun', mara),
  ];
}

/** The points left at the end of each day of the mocks' sprint so far: 24 left, 7 behind. */
export const theMocksSparkline = [33, 33, 34, 33, 32, 32, 31, 31, 31, 29, 28, 27, 25, 24];

export class Plan {
  members = [...theSix];
  viewer = mara.membershipId;
  hostMembershipId = mara.membershipId;
  stories: PlanStory[] = theMocksStories();
  sprint: { name: string; firstDay: string; lastDay: string; daysLeft: number } | null = {
    name: 'Planning sprint',
    firstDay: '2026-08-30',
    lastDay: '2026-09-26',
    daysLeft: 14,
  };
  progress: { pointsLeft: number; behind: number; sparkline: number[] } | null = {
    pointsLeft: 24,
    behind: 7,
    sparkline: theMocksSparkline,
  };
  version = 1;
  /** Reads of the board, answered or not. */
  reads = 0;
  /** The bodies of `POST …/plan/stories`, in the order they came. */
  readonly added: Record<string, unknown>[] = [];
  /** Each `PUT …/stories/{id}/column`, by the story's title. */
  readonly moves: { title: string; column: string }[] = [];
  /** The bodies of `PUT …/stories/{id}`, in the order they came. */
  readonly saves: Record<string, unknown>[] = [];
  private failing?: Failure;
  private writesFail = false;
  private held?: Promise<void>;
  private writesHeld?: Promise<void>;

  constructor(private readonly page: Page) {}

  async install(): Promise<void> {
    await this.page.route(`**/api/popkins/${popkinId}/plan**`, (route) => this.route(route));
  }

  fail(how: Failure = 'server'): void {
    this.failing = how;
  }

  recover(): void {
    this.failing = undefined;
  }

  /** Every write answers 500 until `writesRecover`. */
  failWrites(): void {
    this.writesFail = true;
  }

  writesRecover(): void {
    this.writesFail = false;
  }

  /** The writes do not answer until the returned function is called. */
  holdWrites(): () => void {
    let release: () => void = () => undefined;
    this.writesHeld = new Promise((resolve) => (release = resolve));
    return () => {
      this.writesHeld = undefined;
      release();
    };
  }

  /** The reads do not answer until the returned function is called. */
  hold(): () => void {
    let release: () => void = () => undefined;
    this.held = new Promise((resolve) => (release = resolve));
    return () => {
      this.held = undefined;
      release();
    };
  }

  /** `GET …/plan`: the board as the API answers it (L2-068). */
  board() {
    return {
      sprint: this.sprint,
      stories: this.stories.map((s) => this.storyOf(s)),
      progress: this.progress,
      version: this.version,
    };
  }

  storyOf(s: PlanStory) {
    const owner = this.members.find((m) => m.membershipId === s.ownerMembershipId);
    return {
      id: s.id,
      title: s.title,
      column: s.column,
      points: s.points,
      tag: s.tag,
      owner: owner
        ? { membershipId: owner.membershipId, firstName: owner.firstName, avatar: owner.avatar }
        : null,
      dueDate: s.dueDate,
      commentCount: 0,
      addedByMembershipId: s.addedByMembershipId,
      canDelete:
        this.viewer === this.hostMembershipId ||
        this.viewer === s.addedByMembershipId ||
        this.viewer === s.ownerMembershipId,
      addedAt: s.addedAt,
    };
  }

  private async refusal(route: Route): Promise<boolean> {
    await this.held;
    if (this.failing === 'server') {
      await route.fulfill({ status: 500 });
      return true;
    }
    if (this.failing) {
      const refusal =
        this.failing === 'off' ? problem(404, 'feature_off') : problem(404, 'popkin_not_found');
      await route.fulfill({ status: refusal.status, json: refusal.body });
      return true;
    }
    return false;
  }

  private async route(route: Route): Promise<void> {
    const url = new URL(route.request().url());
    const rest = url.pathname.split(`/popkins/${popkinId}/plan`)[1] ?? '';
    const method = route.request().method();
    if (rest === '' && method === 'GET') {
      this.reads++;
      if (await this.refusal(route)) return;
      return route.fulfill({ json: this.board() });
    }
    if (rest === '/stories' && method === 'POST') return this.add(route);
    const moving = rest.match(/^\/stories\/([^/]+)\/column$/);
    if (moving && method === 'PUT') return this.move(route, moving[1]);
    const one = rest.match(/^\/stories\/([^/]+)$/);
    if (one && method === 'PUT') return this.save(route, one[1]);
    return route.fallback();
  }

  /** `PUT …/stories/{id}/column`: the story goes last in its new column (L2-070 AC2). */
  private async move(route: Route, id: string): Promise<void> {
    const column = (route.request().postDataJSON() as { column: Column }).column;
    const found = this.stories.find((s) => s.id === id);
    if (!found) return route.fulfill({ status: 404, json: problem(404, 'story_not_found').body });
    this.moves.push({ title: found.title, column });
    await this.writesHeld;
    if (this.writesFail) return route.fulfill({ status: 500 });
    const moved = { ...found, column };
    this.stories = [...this.stories.filter((s) => s.id !== id), moved];
    this.version++;
    return route.fulfill({ json: this.storyOf(moved) });
  }

  /** `PUT …/stories/{id}`: every field as sent; a story that moved goes last in its column (L2-070 AC3). */
  private async save(route: Route, id: string): Promise<void> {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    const found = this.stories.find((s) => s.id === id);
    if (!found) return route.fulfill({ status: 404, json: problem(404, 'story_not_found').body });
    this.saves.push(body);
    await this.writesHeld;
    if (this.writesFail) return route.fulfill({ status: 500 });
    const saved: PlanStory = {
      ...found,
      title: String(body['title']).trim(),
      column: body['column'] as Column,
      points: Number(body['points']),
      tag: body['tag'] as Tag,
      ownerMembershipId: (body['ownerMembershipId'] as string | null) ?? null,
      dueDate: (body['dueDate'] as string | null) ?? null,
    };
    this.stories =
      saved.column === found.column
        ? this.stories.map((s) => (s.id === id ? saved : s))
        : [...this.stories.filter((s) => s.id !== id), saved];
    this.version++;
    return route.fulfill({ json: this.storyOf(saved) });
  }

  /** `POST …/plan/stories`: the story goes last in its column (L2-069 AC5). */
  private async add(route: Route): Promise<void> {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    this.added.push(body);
    await this.writesHeld;
    if (this.writesFail) return route.fulfill({ status: 500 });
    const added = story(
      String(body['title']).trim(),
      body['column'] as Column,
      Number(body['points']),
      body['tag'] as Tag,
      body['ownerMembershipId'] ? { membershipId: String(body['ownerMembershipId']) } : null,
      { addedByMembershipId: this.viewer },
    );
    this.stories.push(added);
    this.version++;
    return route.fulfill({ status: 201, json: this.storyOf(added) });
  }
}

const fullNames: Record<string, string> = {
  Mara: 'Mara Okafor',
  Walt: 'Walt Brennan',
  Dev: 'Dev Patel',
  Ellie: 'Ellie Brennan',
  Sam: 'Sam Ortega',
  Priya: 'Priya Nair',
};

/** The six of Cabin Week ’27 as `GET …/members` answers them, Mara the Host and the viewer. */
const theSixMembers = theSix.map((person, i) => ({
  membershipId: person.membershipId,
  displayName: fullNames[person.firstName] ?? person.firstName,
  avatar: person.avatar,
  role: i === 0 ? ('Host' as const) : ('Member' as const),
  isViewer: i === 0,
}));

const plans = new WeakMap<Page, Plan>();

export function planOf(page: Page): Plan {
  const plan = plans.get(page);
  if (!plan) throw new Error('This page has no plan.');
  return plan;
}

/**
 * Mara, the Host, in Cabin Week ’27 with Plan and Schedules on, on the mocks' Saturday, its
 * Plan answering.
 */
export async function maraWithAPlan(
  page: Page,
  change?: (plan: Plan, home: Home) => void,
): Promise<Plan> {
  await page.clock.install({ time: planNow });
  const plan = new Plan(page);
  await maraAtHome(page, (home) => {
    home.popkin.plan = true;
    home.popkin.schedules = true;
    home.popkin.name = 'Cabin Week ’27';
    home.popkin.emoji = '🛶';
    home.popkin.colour = 'Sky';
    home.popkin.length = 'KeepItGoing';
    home.popkin.endsAt = null;
    home.popkin.memberCount = 6;
    home.members = theSixMembers;
    change?.(plan, home);
  });
  await plan.install();
  // Schedules is on too, as in the mocks: its tab shows, and the home asks for its section.
  await new Schedule(page).install();
  plans.set(page, plan);
  return plan;
}

/*
 * The states of the board the mocks draw, for the sweeps and the parity specs: each is the step
 * before the page opens.
 */

/** The board of the mocks: fourteen stories, 14 days left. */
export async function theMockPlan(page: Page): Promise<void> {
  await maraWithAPlan(page);
}

/** A Popkin with no stories yet, and so no sprint (L2-068 AC9). */
export async function thePlanEmpty(page: Page): Promise<void> {
  await maraWithAPlan(page, (plan) => {
    plan.stories = [];
    plan.sprint = null;
    plan.progress = null;
  });
}

export async function thePlanLoading(page: Page): Promise<void> {
  const plan = await maraWithAPlan(page);
  plan.hold();
}

export async function thePlanFailing(page: Page): Promise<void> {
  const plan = await maraWithAPlan(page);
  plan.fail();
}

/** Plan switched off while the tab was open (L2-077 AC2). */
export async function thePlanOff(page: Page): Promise<void> {
  const plan = await maraWithAPlan(page);
  plan.fail('off');
}

/**
 * "New story" as the mocks draw it: "Who brings what: packing list", 2 points, Ellie on it
 * (L2-069). Opened from the header from 768 px and from the floating action below.
 */
export async function openNewStory(page: Page, filled = true): Promise<NewStoryDialog> {
  const board = new PlanBoardPage(page);
  await board.cards.first().waitFor();
  const opener = (await board.newStory.isVisible()) ? board.newStory : board.newStoryFab;
  await opener.click();
  const dialog = new NewStoryDialog(page);
  await dialog.member('Ellie').waitFor();
  if (filled) {
    await dialog.title.fill('Who brings what: packing list');
    await dialog.member('Ellie').click();
  }
  return dialog;
}

/** Opens a story's dialog from its card: "Book the cabin at Pine Hollow" as the mocks do (L2-070). */
export async function openStory(
  page: Page,
  title = 'Book the cabin at Pine Hollow',
): Promise<StoryDialog> {
  await new PlanBoardPage(page).card(title).root.click();
  const dialog = new StoryDialog(page, title);
  await dialog.member('Mara').waitFor();
  return dialog;
}
