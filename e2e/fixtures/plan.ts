import type { Page, Route } from '@playwright/test';
import { people, popkinId } from './chat';
import { sam } from './experiences';
import { maraAtHome, type Home } from './home';
import { Schedule, priya, theSix } from './schedule';
import { problem } from './stubs';

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
  private failing?: Failure;
  private held?: Promise<void>;

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
    return route.fallback();
  }
}

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
    change?.(plan, home);
  });
  await plan.install();
  // Schedules is on too, as in the mocks: its tab shows, and the home asks for its section.
  await new Schedule(page).install();
  plans.set(page, plan);
  return plan;
}
