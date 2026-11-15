import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { TimeOffStatus, TimeOffWeekView } from '../../models/schedule';
import { SCHEDULE_API } from './schedule-api';
import { TimeOffStore } from './time-off-store';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
/** The hub's events the Schedule's stores follow (L2-072 AC11). */
const realtime = {
  scheduleChanged$: new Subject<string>(),
  memberLeft$: new Subject<{ popkinId: string; membershipId: string }>(),
  reconnected$: new Subject<void>(),
  started: 0,
  start() {
    this.started++;
  },
};

const today = '2027-02-17';
const avatar = { initials: 'MO', accent: 'Coral', photoUrl: null } as const;
const working: TimeOffStatus[] = [
  'Working',
  'Working',
  'Working',
  'Working',
  'Working',
  'Weekend',
  'Weekend',
];

function weekOf(monday: string, maraDays = working): TimeOffWeekView {
  return {
    week: monday,
    event: null,
    canEdit: true,
    members: [
      { membershipId: 'm-mara', firstName: 'Mara', avatar, isMe: true, days: maraDays },
      { membershipId: 'm-walt', firstName: 'Walt', avatar, isMe: false, days: working },
    ],
  };
}

const cabinWeek = { label: 'Cabin week', firstDay: '2027-02-15', lastDay: '2027-02-19' };

describe('TimeOffStore', () => {
  type Answer = TimeOffWeekView | 'down' | 'missing' | 'off' | Subject<TimeOffWeekView>;
  let answer: Answer;
  let asked: string[];
  let store: TimeOffStore;

  beforeEach(() => {
    answer = weekOf('2027-02-15');
    asked = [];
    const timeOff = (
      _: string,
      at: { week?: string; today?: string },
    ): Observable<TimeOffWeekView> => {
      asked.push(at.week ?? `today ${at.today}`);
      if (answer === 'down') return throwError(() => new HttpErrorResponse({ status: 500 }));
      if (answer === 'missing' || answer === 'off') {
        const code = answer === 'off' ? 'feature_off' : 'popkin_not_found';
        return throwError(() => new HttpErrorResponse({ status: 404, error: { code } }));
      }
      return answer instanceof Subject ? answer : of(answer);
    };
    TestBed.configureTestingModule({
      providers: [
        TimeOffStore,
        { provide: SCHEDULE_API, useValue: { timeOff } },
        { provide: POPKIN_REALTIME, useValue: realtime },
      ],
    });
    store = TestBed.inject(TimeOffStore);
  });

  it('is loading until the week answers', () => {
    answer = new Subject<TimeOffWeekView>();
    store.open('p1', '2027-02-17', today);
    expect(store.state()).toBe('loading');
  });

  it('asks for the week of the day it is given, and draws it', () => {
    store.open('p1', '2027-02-17', today);

    expect(asked).toEqual(['2027-02-15']);
    expect(store.state()).toBe('ready');
    const table = store.table()!;
    expect(table.label).toBe('Feb 15 – 21');
    expect(table.days.map((day) => `${day.weekday} ${day.date}`)).toEqual([
      'Mon 15',
      'Tue 16',
      'Wed 17',
      'Thu 18',
      'Fri 19',
      'Sat 20',
      'Sun 21',
    ]);
    expect(table.rows.map((row) => row.name)).toEqual(['Mara', 'Walt']);
  });

  it('counts who is off each weekday, and none on a weekend', () => {
    answer = weekOf('2027-02-15', [
      'Off',
      'Tentative',
      'Working',
      'Off',
      'Off',
      'Weekend',
      'Weekend',
    ]);
    store.open('p1', '2027-02-15', today);

    expect(store.table()!.days.map((day) => day.off)).toEqual([
      '1 of 2 off',
      '0 of 2 off',
      '0 of 2 off',
      '1 of 2 off',
      '1 of 2 off',
      null,
      null,
    ]);
    expect(store.table()!.days[0].many).toBe(true);
    expect(store.nobodyYet()).toBe(false);
  });

  it('says nobody has added time off when every weekday is Working', () => {
    store.open('p1', '2027-02-15', today);
    expect(store.nobodyYet()).toBe(true);
  });

  it('fails, and reads again on retry', () => {
    answer = 'down';
    store.open('p1', '2027-02-15', today);
    expect(store.state()).toBe('error');

    answer = weekOf('2027-02-15');
    store.retry();
    expect(store.state()).toBe('ready');
    expect(asked).toEqual(['2027-02-15', '2027-02-15']);
  });

  it('tells a Popkin that is not there from Schedules switched off', () => {
    answer = 'missing';
    store.open('p1', '2027-02-15', today);
    expect(store.state()).toBe('not-found');

    answer = 'off';
    store.retry();
    expect(store.state()).toBe('off');
  });

  it('opens without a week on the week the API names, sending the viewer’s today', () => {
    answer = { ...weekOf('2027-02-15'), event: cabinWeek };
    store.open('p1', undefined, '2027-01-04');

    expect(asked).toEqual(['today 2027-01-04']);
    expect(store.table()!.week).toBe('2027-02-15');
  });

  it('gives the month, its weeks with the event’s dot, and the weeks and months around', () => {
    answer = { ...weekOf('2027-02-22'), event: cabinWeek };
    store.open('p1', '2027-02-22', today);

    const nav = store.nav()!;
    expect(nav.month).toBe('February');
    expect(nav.year).toBe('2027');
    expect(nav.weeks.map((week) => [week.label, week.pressed, week.event])).toEqual([
      ['Feb 1 – 7', false, false],
      ['Feb 8 – 14', false, false],
      ['Feb 15 – 21', false, true],
      ['Feb 22 – 28', true, false],
    ]);
    expect(nav.weeks[0].week).toBe('2027-02-01');
    expect([nav.previousWeek, nav.nextWeek]).toEqual(['2027-02-15', '2027-03-01']);
    expect([nav.previousMonth, nav.nextMonth]).toEqual(['2027-01-04', '2027-03-01']);
    expect(nav.goTo).toEqual({ label: 'Go to Cabin week', week: '2027-02-15' });
  });

  it('offers no "Go to" on the event’s week, nor without an event', () => {
    answer = { ...weekOf('2027-02-15'), event: cabinWeek };
    store.open('p1', '2027-02-15', today);
    expect(store.nav()!.goTo).toBeNull();

    answer = weekOf('2027-02-22');
    store.open('p1', '2027-02-22', today);
    expect(store.nav()!.goTo).toBeNull();
  });

  it('gives my own week, Monday to Friday, to add my time off (L2-073 AC1)', () => {
    answer = weekOf('2027-02-15', [
      'Off',
      'Tentative',
      'Working',
      'Off',
      'Working',
      'Weekend',
      'Weekend',
    ]);
    store.open('p1', '2027-02-15', today);

    const mine = store.mine()!;
    expect(mine.membershipId).toBe('m-mara');
    expect(mine.week).toBe('2027-02-15');
    expect(mine.label).toBe('Feb 15 – 19');
    expect(mine.tooFar).toBe(false);
    expect(mine.days).toEqual([
      { name: 'Mon 15', choice: 'Off' },
      { name: 'Tue 16', choice: 'Tentative' },
      { name: 'Wed 17', choice: 'Working' },
      { name: 'Thu 18', choice: 'Off' },
      { name: 'Fri 19', choice: 'Working' },
    ]);
  });

  it('says when my week is more than a year ahead (L2-073 AC5)', () => {
    answer = weekOf('2028-02-21');
    store.open('p1', '2028-02-21', today);

    expect(store.mine()!.label).toBe('Feb 21 – 25, 2028');
    expect(store.mine()!.tooFar).toBe(true);
  });

  it('offers nothing to add when the week cannot be changed', () => {
    answer = { ...weekOf('2027-02-15'), canEdit: false };
    store.open('p1', '2027-02-15', today);

    expect(store.mine()).toBeNull();
  });

  it('draws the week a save answers with, without reading it again (L2-073 AC2)', () => {
    store.open('p1', '2027-02-15', today);
    asked = [];

    store.saved(
      weekOf('2027-02-15', ['Off', 'Off', 'Working', 'Working', 'Working', 'Weekend', 'Weekend']),
    );

    expect(asked).toEqual([]);
    expect(store.table()!.rows[0].days.slice(0, 2)).toEqual(['Off', 'Off']);
    expect(store.nobodyYet()).toBe(false);
  });

  // L2-072 AC11: what another member changes reaches the open view without a reload.
  describe('live', () => {
    it('opens the connection', () => {
      const before = realtime.started;
      store.open('p1', '2027-02-15', today);
      expect(realtime.started).toBe(before + 1);
    });

    it('reads again when the schedule of its Popkin changes, and not for another', () => {
      store.open('p1', '2027-02-15', today);
      realtime.scheduleChanged$.next('p2');
      expect(asked).toHaveLength(1);
      realtime.scheduleChanged$.next('p1');
      expect(asked).toEqual(['2027-02-15', '2027-02-15']);
      expect(store.state()).toBe('ready');
    });

    it('reads again when a member leaves its Popkin', () => {
      store.open('p1', '2027-02-15', today);
      realtime.memberLeft$.next({ popkinId: 'p1', membershipId: 'm-walt' });
      expect(asked).toEqual(['2027-02-15', '2027-02-15']);
    });

    it('reads again when the connection comes back', () => {
      store.open('p1', '2027-02-15', today);
      realtime.reconnected$.next();
      expect(asked).toEqual(['2027-02-15', '2027-02-15']);
    });

    it('reads nothing before it is opened', () => {
      realtime.scheduleChanged$.next('p1');
      realtime.reconnected$.next();
      expect(asked).toEqual([]);
    });
  });
});
