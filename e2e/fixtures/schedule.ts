import type { Page, Route } from '@playwright/test';
import { people, popkinId } from './chat';
import { sam } from './experiences';
import { maraAtHome, type Home } from './home';
import { problem } from './stubs';

/**
 * The Schedule of Cabin Week ’27 as the mocks draw it, answered in memory (ADR 0005): six
 * members and their time off, week by week, which a spec can hold, fail or change.
 */
export const scheduleUrl = `/p/${popkinId}/schedule`;
export const timeOffUrl = (week: string) => `${scheduleUrl}?week=${week}`;

/** Wednesday 17 February 2027 at noon on the device: the mocks' week is the current one. */
export const scheduleNow = new Date(2027, 1, 17, 12, 0);

/** The Monday of the mocks' week. */
export const mocksWeek = '2027-02-15';

export const priya = {
  membershipId: '00000000-0000-4000-8000-priya0000000',
  firstName: 'Priya',
  avatar: { initials: 'PN', accent: 'Coral', photoUrl: null },
};

/** The six of the mocks, in the order the table lists them: the Host first. */
export const theSix = [people.mara, people.walt, people.dev, people.ellie, sam, priya];

export type DayKind = 'Off' | 'Tentative';
type Failure = 'server' | 'not-found' | 'off';

export class Schedule {
  members = [...theSix];
  viewer = people.mara.membershipId;
  /** Each member's days off, by date. */
  readonly timeOff = new Map<string, Map<string, DayKind>>();
  event: { label: string; firstDay: string; lastDay: string } | null = null;
  canEdit = true;
  /** The weeks asked for, in order. */
  readonly asked: string[] = [];
  /** The time off saved, in order: whose, and the body sent. */
  readonly saves: { membershipId: string; week: string; days: string[] }[] = [];
  private failing?: Failure;
  private held?: Promise<void>;
  private failingSaves = false;
  private heldSave?: Promise<void>;

  constructor(private readonly page: Page) {}

  async install(): Promise<void> {
    await this.page.route(`**/api/popkins/${popkinId}/schedule/**`, (route) => this.route(route));
  }

  /** The member is off, or tentative, on each of the days. */
  off(membershipId: string, days: string[], kind: DayKind = 'Off'): void {
    const mine = this.timeOff.get(membershipId) ?? new Map<string, DayKind>();
    days.forEach((day) => mine.set(day, kind));
    this.timeOff.set(membershipId, mine);
  }

  fail(how: Failure = 'server'): void {
    this.failing = how;
  }

  recover(): void {
    this.failing = undefined;
    this.failingSaves = false;
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

  /** Saving time off fails until `recover` is called. */
  failSaves(): void {
    this.failingSaves = true;
  }

  /** A save does not answer until the returned function is called. */
  holdSaves(): () => void {
    let release: () => void = () => undefined;
    this.heldSave = new Promise((resolve) => (release = resolve));
    return () => {
      this.heldSave = undefined;
      release();
    };
  }

  /** A week as the API answers it. */
  week(monday: string) {
    return {
      week: monday,
      event: this.event,
      canEdit: this.canEdit,
      members: this.members.map((member) => ({
        membershipId: member.membershipId,
        firstName: member.firstName,
        avatar: member.avatar,
        isMe: member.membershipId === this.viewer,
        days: daysOf(monday).map((day, i) =>
          i >= 5 ? 'Weekend' : (this.timeOff.get(member.membershipId)?.get(day) ?? 'Working'),
        ),
      })),
    };
  }

  private async route(route: Route): Promise<void> {
    const url = new URL(route.request().url());
    const rest = url.pathname.split('/schedule/')[1];
    const saving = rest.match(/^time-off\/([^/]+)$/);
    if (saving && route.request().method() === 'PUT') return this.save(route, saving[1]);
    if (rest !== 'time-off' || route.request().method() !== 'GET') return route.fallback();
    await this.held;
    if (this.failing === 'server') return route.fulfill({ status: 500 });
    if (this.failing) {
      const refusal =
        this.failing === 'off' ? problem(404, 'feature_off') : problem(404, 'popkin_not_found');
      return route.fulfill({ status: refusal.status, json: refusal.body });
    }
    // Without a week, the event's week or else the week of the viewer's today (L2-072 AC8).
    const day =
      url.searchParams.get('week') ??
      this.event?.firstDay ??
      url.searchParams.get('today') ??
      isoDate(scheduleNow);
    const monday = mondayOf(day);
    this.asked.push(monday);
    await route.fulfill({ json: this.week(monday) });
  }

  /** `PUT …/time-off/{membershipId}`: Monday to Friday, Working taking a day back (L2-073). */
  private async save(route: Route, membershipId: string): Promise<void> {
    const body = route.request().postDataJSON() as { week: string; days: string[] };
    this.saves.push({ membershipId, ...body });
    await this.heldSave;
    if (this.failingSaves) return route.fulfill({ status: 500 });
    const monday = mondayOf(body.week);
    const mine = this.timeOff.get(membershipId) ?? new Map<string, DayKind>();
    daysOf(monday)
      .slice(0, 5)
      .forEach((day, i) => {
        const kind = body.days[i];
        if (kind === 'Off' || kind === 'Tentative') mine.set(day, kind);
        else mine.delete(day);
      });
    this.timeOff.set(membershipId, mine);
    await route.fulfill({ json: this.week(monday) });
  }
}

const schedules = new WeakMap<Page, Schedule>();

export function scheduleOf(page: Page): Schedule {
  const schedule = schedules.get(page);
  if (!schedule) throw new Error('This page has no schedule.');
  return schedule;
}

/**
 * Mara, the Host, in Cabin Week ’27 with Schedules on, on the mocks' Wednesday, its Schedule
 * answering.
 */
export async function maraWithASchedule(
  page: Page,
  change?: (schedule: Schedule, home: Home) => void,
): Promise<Schedule> {
  await page.clock.install({ time: scheduleNow });
  const schedule = new Schedule(page);
  await maraAtHome(page, (home) => {
    home.popkin.schedules = true;
    home.popkin.name = 'Cabin Week ’27';
    home.popkin.emoji = '🛶';
    home.popkin.colour = 'Sky';
    home.popkin.length = 'KeepItGoing';
    home.popkin.endsAt = null;
    home.popkin.memberCount = 6;
    change?.(schedule, home);
  });
  await schedule.install();
  schedules.set(page, schedule);
  return schedule;
}

/** The week of the mocks: everyone off on the event's days but Dev, who is tentative. */
export function theMocksTimeOff(schedule: Schedule): void {
  const event = ['2027-02-15', '2027-02-16', '2027-02-17', '2027-02-18', '2027-02-19'];
  schedule.event = { label: 'Cabin week', firstDay: event[0], lastDay: event[4] };
  for (const member of theSix) {
    schedule.off(member.membershipId, event, member === people.dev ? 'Tentative' : 'Off');
  }
}

function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function mondayOf(day: string): string {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return isoDate(date);
}

function daysOf(monday: string): string[] {
  const start = new Date(`${monday}T12:00:00`);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return isoDate(day);
  });
}

/*
 * The states of time off the mocks draw, for the sweeps and the parity specs: each is the step
 * before the page opens.
 */

/** The week of the mocks: the event, everyone off but Dev, who is tentative. */
export async function theMockTimeOff(page: Page): Promise<void> {
  await maraWithASchedule(page, theMocksTimeOff);
}

/** The event's week before anyone has added time off (L2-072 AC10). */
export async function theTimeOffEmpty(page: Page): Promise<void> {
  await maraWithASchedule(page, (schedule) => {
    theMocksTimeOff(schedule);
    schedule.timeOff.clear();
  });
}

/** Everyone off on the event's days. */
export async function theTimeOffConfirmed(page: Page): Promise<void> {
  await maraWithASchedule(page, (schedule) => {
    theMocksTimeOff(schedule);
    schedule.off(people.dev.membershipId, [
      ...(schedule.timeOff.get(people.mara.membershipId)?.keys() ?? []),
    ]);
  });
}

export async function theTimeOffLoading(page: Page): Promise<void> {
  const schedule = await maraWithASchedule(page, theMocksTimeOff);
  schedule.hold();
}

export async function theTimeOffFailing(page: Page): Promise<void> {
  const schedule = await maraWithASchedule(page, theMocksTimeOff);
  schedule.fail();
}
