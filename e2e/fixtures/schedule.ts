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
export interface Stretch {
  start: string;
  end: string;
}

/** Saturday 12 September 2026 at noon on the device: the first of the mocks' this week. */
export const thisWeekNow = new Date(2026, 8, 12, 12, 0);
export const thisWeekUrl = `${scheduleUrl}/week`;
export const thisWeekDayUrl = (day: string) => `${thisWeekUrl}?day=${day}`;
/** `off`: the admin app switched the feature off; `host-off`: the Host did (L2-077 AC2). */
type Failure = 'server' | 'not-found' | 'off' | 'host-off';

export class Schedule {
  members = [...theSix];
  viewer = people.mara.membershipId;
  /** Each member's days off, by date. */
  readonly timeOff = new Map<string, Map<string, DayKind>>();
  event: { label: string; firstDay: string; lastDay: string } | null = null;
  /** Each member's working stretches, by date. */
  readonly hours = new Map<string, Map<string, Stretch[]>>();
  /** The days this week was read from, in order. */
  readonly weeksFrom: string[] = [];
  /** The days the home's summary was read from, in order. */
  readonly summariesFrom: string[] = [];
  /** The working hours saved, in order: whose, and the body sent. */
  readonly hoursSaves: { membershipId: string; from: string; days: Stretch[][] }[] = [];
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

  /** Reads of time off or this week asked for, answered or not. */
  reads = 0;

  /** The reads do not answer until the returned function is called. */
  hold(): () => void {
    let release: () => void = () => undefined;
    this.held = new Promise((resolve) => (release = resolve));
    return () => {
      this.held = undefined;
      release();
    };
  }

  /** The member works these stretches on the day. */
  works(membershipId: string, day: string, ...stretches: [string, string][]): void {
    const mine = this.hours.get(membershipId) ?? new Map<string, Stretch[]>();
    mine.set(
      day,
      stretches.map(([start, end]) => ({ start, end })),
    );
    this.hours.set(membershipId, mine);
  }

  /** This week as the API answers it, the evenings counted as the API counts them (L2-074). */
  thisWeek(from: string) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
    const members = this.members.map((member) => ({
      membershipId: member.membershipId,
      firstName: member.firstName,
      avatar: member.avatar,
      isMe: member.membershipId === this.viewer,
      days: days.map((day) => this.hours.get(member.membershipId)?.get(day) ?? []),
    }));
    return {
      from,
      memberCount: members.length,
      canEdit: this.canEdit,
      days: days.map((date, i) => {
        const evening = eveningOf(members.map((member) => member.days[i]));
        return {
          date,
          freeCount: evening.free,
          everyoneFreeFrom: evening.from,
          lastOffShift: evening.last.map((at) => members[at].firstName),
          working: evening.working.map((at) => members[at].firstName),
        };
      }),
      members,
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
    if (rest === 'week' && route.request().method() === 'GET') return this.readWeek(route, url);
    if (rest === 'summary' && route.request().method() === 'GET') {
      return this.readSummary(route, url);
    }
    const hours = rest.match(/^hours\/([^/]+)$/);
    if (hours && route.request().method() === 'PUT') return this.saveHours(route, hours[1]);
    const saving = rest.match(/^time-off\/([^/]+)$/);
    if (saving && route.request().method() === 'PUT') return this.save(route, saving[1]);
    if (rest !== 'time-off' || route.request().method() !== 'GET') return route.fallback();
    this.reads++;
    await this.held;
    if (this.failing === 'server') return route.fulfill({ status: 500 });
    if (this.failing) {
      const refusal =
        this.failing === 'not-found'
          ? problem(404, 'popkin_not_found')
          : problem(404, 'feature_off', {
              switchedOffBy: this.failing === 'host-off' ? 'Host' : 'Popkin',
            });
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

  /** `GET …/schedule/summary?from=`: the home's Schedule section (L2-075 AC2). */
  private async readSummary(route: Route, url: URL): Promise<void> {
    const from = url.searchParams.get('from') ?? isoDate(scheduleNow);
    this.summariesFrom.push(from);
    const week = this.thisWeek(from);
    const free = week.days.find((day) => day.everyoneFreeFrom !== null);
    await route.fulfill({
      json: {
        hasHours: week.members.some((member) => member.days.some((day) => day.length > 0)),
        day: free?.date ?? null,
        everyoneFreeFrom: free?.everyoneFreeFrom ?? null,
      },
    });
  }

  /** `GET …/schedule/week?from=`: seven days from the viewer's today (L2-074). */
  private async readWeek(route: Route, url: URL): Promise<void> {
    this.reads++;
    await this.held;
    if (this.failing === 'server') return route.fulfill({ status: 500 });
    if (this.failing) {
      const refusal =
        this.failing === 'not-found'
          ? problem(404, 'popkin_not_found')
          : problem(404, 'feature_off', {
              switchedOffBy: this.failing === 'host-off' ? 'Host' : 'Popkin',
            });
      return route.fulfill({ status: refusal.status, json: refusal.body });
    }
    const from = url.searchParams.get('from') ?? isoDate(thisWeekNow);
    this.weeksFrom.push(from);
    await route.fulfill({ json: this.thisWeek(from) });
  }

  /** `PUT …/schedule/hours/{membershipId}`: the seven days from `from` (L2-074 AC8). */
  private async saveHours(route: Route, membershipId: string): Promise<void> {
    const body = route.request().postDataJSON() as { from: string; days: Stretch[][] };
    this.hoursSaves.push({ membershipId, ...body });
    await this.heldSave;
    if (this.failingSaves) return route.fulfill({ status: 500 });
    body.days.forEach((stretches, i) => {
      const day = addDays(body.from, i);
      const mine = this.hours.get(membershipId) ?? new Map<string, Stretch[]>();
      mine.set(day, stretches);
      this.hours.set(membershipId, mine);
    });
    await route.fulfill({ json: this.thisWeek(body.from) });
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

/** Free means not working between 8 and 11 pm; when everyone is, from when (L2-074 AC2, AC3). */
function eveningOf(members: Stretch[][]) {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const working = members
    .map((day, at) => ({ day, at }))
    .filter(({ day }) => day.some((s) => minutes(s.start) < 23 * 60 && minutes(s.end) > 20 * 60))
    .map(({ at }) => at);
  if (working.length > 0) {
    return { free: members.length - working.length, from: null, last: [] as number[], working };
  }
  const ends = members.map((day) =>
    Math.max(0, ...day.map((s) => minutes(s.end)).filter((end) => end <= 20 * 60)),
  );
  const from = Math.max(17 * 60, ...ends);
  const last = from > 17 * 60 ? ends.flatMap((end, at) => (end === from ? [at] : [])) : [];
  const time = `${String(Math.floor(from / 60)).padStart(2, '0')}:${String(from % 60).padStart(2, '0')}`;
  return { free: members.length, from: time, last, working: [] as number[] };
}

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
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

/*
 * This week of the mocks: Saturday 12 to Friday 18 September 2026, Wednesday the one evening all
 * six are free, from 7:30 pm when Ellie is off shift.
 */
export function theMocksHours(schedule: Schedule): void {
  const [mara, walt, dev, ellie, sam, priya] = theSix.map((member) => member.membershipId);
  schedule.works(dev, '2026-09-12', ['16:00', '23:00']);
  schedule.works(sam, '2026-09-12', ['17:00', '23:00']);
  schedule.works(dev, '2026-09-13', ['16:00', '23:00']);
  schedule.works(ellie, '2026-09-13', ['18:00', '24:00']);
  schedule.works(sam, '2026-09-14', ['14:00', '22:00']);
  schedule.works(mara, '2026-09-15', ['09:00', '17:30']);
  schedule.works(dev, '2026-09-15', ['14:00', '22:00']);
  schedule.works(ellie, '2026-09-15', ['19:00', '24:00']);
  schedule.works(sam, '2026-09-15', ['16:00', '23:00']);
  schedule.works(priya, '2026-09-15', ['08:30', '17:00']);
  schedule.works(mara, '2026-09-16', ['09:00', '17:30']);
  schedule.works(walt, '2026-09-16', ['11:00', '19:00']);
  schedule.works(dev, '2026-09-16', ['07:00', '15:30']);
  schedule.works(ellie, '2026-09-16', ['07:00', '19:30']);
  schedule.works(sam, '2026-09-16', ['10:00', '17:00']);
  schedule.works(priya, '2026-09-16', ['08:30', '17:00']);
  schedule.works(walt, '2026-09-17', ['15:00', '23:00']);
  schedule.works(ellie, '2026-09-17', ['19:00', '24:00']);
  schedule.works(dev, '2026-09-18', ['14:00', '22:00']);
}

/** Mara in Cabin Week ’27 on the mocks' Saturday, with Schedules on. */
export async function maraThisWeek(
  page: Page,
  change?: (schedule: Schedule) => void,
): Promise<Schedule> {
  await page.clock.install({ time: thisWeekNow });
  const schedule = new Schedule(page);
  await maraAtHome(page, (home) => {
    home.popkin.schedules = true;
    home.popkin.name = 'Cabin Week ’27';
    home.popkin.emoji = '🛶';
    home.popkin.colour = 'Sky';
    home.popkin.length = 'KeepItGoing';
    home.popkin.endsAt = null;
    home.popkin.memberCount = 6;
    change?.(schedule);
  });
  await schedule.install();
  schedules.set(page, schedule);
  return schedule;
}

/** Dev works every evening of the mocks' week: no evening is free for everyone (L2-075 AC2). */
export function devWorksEveryEvening(schedule: Schedule): void {
  for (let i = 0; i < 7; i++) {
    schedule.works(theSix[2].membershipId, addDays('2026-09-12', i), ['14:00', '22:00']);
  }
}

export async function theHomeWithNoEveningFree(page: Page): Promise<void> {
  await maraThisWeek(page, devWorksEveryEvening);
}

/** The states of this week the mocks draw: each is the step before the page opens. */
export async function theMockThisWeek(page: Page): Promise<void> {
  await maraThisWeek(page, theMocksHours);
}

export async function theThisWeekEmpty(page: Page): Promise<void> {
  await maraThisWeek(page);
}

export async function theThisWeekLoading(page: Page): Promise<void> {
  const schedule = await maraThisWeek(page, theMocksHours);
  schedule.hold();
}

export async function theThisWeekFailing(page: Page): Promise<void> {
  const schedule = await maraThisWeek(page, theMocksHours);
  schedule.fail();
}

/**
 * The weeks a view asked for, each once: an open view reads itself again once the hub has
 * connected (the shared real-time rules), so a spec of which week opens compares these, not the
 * count of reads.
 */
export function weeksAsked(asked: readonly string[]): string[] {
  return [...new Set(asked)];
}
