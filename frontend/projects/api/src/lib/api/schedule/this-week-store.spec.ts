import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { EveningView, StretchView, ThisWeekView } from '../../models/this-week';
import { SCHEDULE_API } from './schedule-api';
import { ThisWeekStore } from './this-week-store';
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

const today = '2026-09-12';
const avatar = { initials: 'MO', accent: 'Coral', photoUrl: null } as const;
const dates = [
  '2026-09-12',
  '2026-09-13',
  '2026-09-14',
  '2026-09-15',
  '2026-09-16',
  '2026-09-17',
  '2026-09-18',
];
const none: StretchView[][] = dates.map(() => []);

function evening(date: string, change: Partial<EveningView> = {}): EveningView {
  return {
    date,
    freeCount: 3,
    everyoneFreeFrom: '17:00',
    lastOffShift: [],
    working: [],
    ...change,
  };
}

/** Mara, Walt and Dev; Walt works till 7:30 pm on Wednesday, Dev in the evening on Tuesday. */
function theWeek(): ThisWeekView {
  const walt = none.map((day, i) => (i === 4 ? [{ start: '09:00', end: '19:30' }] : day));
  const dev = none.map((day, i) => (i === 3 ? [{ start: '14:00', end: '22:00' }] : day));
  return {
    from: today,
    memberCount: 3,
    canEdit: true,
    days: dates.map((date, i) =>
      i === 4
        ? evening(date, { everyoneFreeFrom: '19:30', lastOffShift: ['Walt'] })
        : i === 3
          ? evening(date, { freeCount: 2, everyoneFreeFrom: null, working: ['Dev'] })
          : evening(date, { freeCount: 2, everyoneFreeFrom: null, working: ['Dev'] }),
    ),
    members: [
      { membershipId: 'm-mara', firstName: 'Mara', avatar, isMe: true, days: none },
      { membershipId: 'm-walt', firstName: 'Walt', avatar, isMe: false, days: walt },
      { membershipId: 'm-dev', firstName: 'Dev', avatar, isMe: false, days: dev },
    ],
  };
}

describe('ThisWeekStore', () => {
  type Answer = ThisWeekView | 'down' | 'missing' | 'off' | Subject<ThisWeekView>;
  let answer: Answer;
  let asked: string[];
  let store: ThisWeekStore;

  beforeEach(() => {
    answer = theWeek();
    asked = [];
    const thisWeek = (_: string, from: string): Observable<ThisWeekView> => {
      asked.push(from);
      if (answer === 'down') return throwError(() => new HttpErrorResponse({ status: 500 }));
      if (answer === 'missing' || answer === 'off') {
        const code = answer === 'off' ? 'feature_off' : 'popkin_not_found';
        return throwError(() => new HttpErrorResponse({ status: 404, error: { code } }));
      }
      return answer instanceof Subject ? answer : of(answer);
    };
    TestBed.configureTestingModule({
      providers: [
        ThisWeekStore,
        { provide: SCHEDULE_API, useValue: { thisWeek } },
        { provide: POPKIN_REALTIME, useValue: realtime },
      ],
    });
    store = TestBed.inject(ThisWeekStore);
  });

  it('is loading until the week answers', () => {
    answer = new Subject<ThisWeekView>();
    store.open('p1', undefined, today);
    expect(store.state()).toBe('loading');
  });

  // L2-074 AC1, AC2
  it('reads seven days from today and chooses today', () => {
    store.open('p1', undefined, today);

    expect(asked).toEqual([today]);
    expect(store.state()).toBe('ready');
    expect(store.subtitle()).toBe('Sep 12 – 18 · everyone’s working hours');
    const days = store.days();
    expect(days.map((day) => `${day.weekday} ${day.date} ${day.free}`)).toEqual([
      'Sat 12 2/3 free',
      'Sun 13 2/3 free',
      'Mon 14 2/3 free',
      'Tue 15 2/3 free',
      'Wed 16 3/3 free',
      'Thu 17 2/3 free',
      'Fri 18 2/3 free',
    ]);
    expect(days.map((day) => day.pressed)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(days[4].all).toBe(true);
    expect(days[0].all).toBe(false);
  });

  // L2-074 AC3, AC5, AC6, AC7
  it('gives the chosen evening when everyone is free: the headline, the timeline and the draft', () => {
    store.open('p1', '2026-09-16', today);

    expect(asked).toEqual([today]);
    expect(store.days()[4].pressed).toBe(true);
    const chosen = store.chosen()!;
    expect(chosen.headline).toEqual({ text: 'Wednesday, everyone’s free from ', time: '7:30 pm.' });
    expect(chosen.sub).toBe(
      'Walt is the last off shift. The only evening this week all three of you are around.',
    );
    expect(chosen.action).toEqual({ label: 'Plan dinner in chat', variant: 'popkin' });
    expect(chosen.draft).toBe(
      'Everyone’s free Wednesday from 7:30 pm. Dinner to catch up on the plan? Ideas for where?',
    );
    expect(chosen.shifts.label).toBe('Who is working on Wednesday');
    expect(chosen.shifts.text).toBe(
      'Mara: free all afternoon and evening; Walt: working 9 am to 7:30 pm; Dev: free all afternoon and evening.',
    );
    expect(chosen.shifts.rows.map((row) => row.name)).toEqual(['Mara', 'Walt', 'Dev']);
    expect(chosen.shifts.rows[1].blocks).toEqual([
      { left: 0, width: (7.5 / 12) * 100, label: 'Working till 7:30 pm' },
    ]);
    expect(chosen.shifts.tint).toBe(62.5);
    expect(chosen.shifts.legend).toEqual([
      { label: 'At work', swatch: 'card' },
      { label: 'All three free from ', swatch: 'tint', emphasis: '7:30 pm' },
    ]);
  });

  // L2-074 AC4, AC7
  it('gives an evening someone works: who is free, who is working, and asks anyway', () => {
    store.open('p1', '2026-09-15', today);

    const chosen = store.chosen()!;
    expect(chosen.headline).toEqual({
      text: 'Tuesday, 2 of 3 are free in the evening.',
      time: null,
    });
    expect(chosen.sub).toBe('Dev is working. Wednesday is the one evening everyone is free.');
    expect(chosen.action).toEqual({ label: 'Ask in chat anyway', variant: 'secondary' });
    expect(chosen.draft).toBe(
      'Mara and Walt: free Tuesday evening? Could be a small dinner to catch up on the plan.',
    );
    expect(chosen.shifts.tint).toBeNull();
    expect(chosen.shifts.legend).toEqual([{ label: 'At work', swatch: 'card' }]);
  });

  it('chooses another day without reading again', () => {
    store.open('p1', undefined, today);
    store.open('p1', '2026-09-16', today);

    expect(asked).toEqual([today]);
    expect(store.chosen()!.headline.time).toBe('7:30 pm.');
  });

  it('chooses today for a day outside the seven', () => {
    store.open('p1', '2026-09-30', today);

    expect(store.days()[0].pressed).toBe(true);
  });

  // L2-074 AC9
  it('says nobody has added hours yet, with no timeline', () => {
    answer = {
      ...theWeek(),
      days: dates.map((date) => evening(date)),
      members: theWeek().members.map((member) => ({ ...member, days: none })),
    };
    store.open('p1', undefined, today);

    const chosen = store.chosen()!;
    expect(chosen.empty).toBe(true);
    expect(chosen.headline).toEqual({ text: 'Nobody has added their hours yet.', time: null });
    expect(chosen.sub).toBe(
      'Each of you adds your own working hours; this week finds the evening everyone is free. Add yours to get it started.',
    );
    expect(store.days().every((day) => day.free === '3/3 free' && day.all)).toBe(true);
  });

  it('fails, and reads again on retry', () => {
    answer = 'down';
    store.open('p1', undefined, today);
    expect(store.state()).toBe('error');

    answer = theWeek();
    store.retry();
    expect(store.state()).toBe('ready');
    expect(asked).toEqual([today, today]);
  });

  it('tells a Popkin that is not there from Schedules switched off', () => {
    answer = 'missing';
    store.open('p1', undefined, today);
    expect(store.state()).toBe('not-found');

    answer = 'off';
    store.open('p2', undefined, today);
    expect(store.state()).toBe('off');
  });
  // L2-074 AC8: my hours for the seven days, as the dialog's fields hold them.
  it('gives my hours for the seven days, a blank stretch for a day off and midnight as 00:00', () => {
    const week = theWeek();
    week.members[0].days = none.map((day, i) =>
      i === 1
        ? [
            { start: '06:00', end: '10:00' },
            { start: '18:00', end: '24:00' },
          ]
        : i === 3
          ? [{ start: '09:00', end: '17:30' }]
          : day,
    );
    answer = week;
    store.open('p1', undefined, today);

    const mine = store.mine();
    expect(mine?.membershipId).toBe('m-mara');
    expect(mine?.from).toBe(today);
    expect(mine?.label).toBe('Sep 12 – 18');
    expect(mine?.days.map((day) => day.name)).toEqual([
      'Sat 12',
      'Sun 13',
      'Mon 14',
      'Tue 15',
      'Wed 16',
      'Thu 17',
      'Fri 18',
    ]);
    expect(mine?.days[0]).toEqual({
      name: 'Sat 12',
      weekday: 'Saturday',
      stretches: [{ start: '', end: '' }],
    });
    expect(mine?.days[1].stretches).toEqual([
      { start: '06:00', end: '10:00' },
      { start: '18:00', end: '00:00' },
    ]);
    expect(mine?.days[3].stretches).toEqual([{ start: '09:00', end: '17:30' }]);
  });

  it('offers no hours of mine once the Popkin can no longer be changed', () => {
    answer = { ...theWeek(), canEdit: false };
    store.open('p1', undefined, today);
    expect(store.mine()).toBeNull();
  });

  it('shows the week as saved', () => {
    store.open('p1', undefined, today);
    const week = theWeek();
    week.days[0] = evening(today, { freeCount: 1, everyoneFreeFrom: null, working: ['Mara'] });
    store.saved(week);
    expect(store.days()[0].free).toBe('1/3 free');
  });

  // L2-072 AC11: what another member changes reaches the open view without a reload.
  describe('live', () => {
    it('opens the connection', () => {
      const before = realtime.started;
      store.open('p1', undefined, today);
      expect(realtime.started).toBe(before + 1);
    });

    it('reads again when the schedule of its Popkin changes, and not for another', () => {
      store.open('p1', undefined, today);
      realtime.scheduleChanged$.next('p2');
      expect(asked).toHaveLength(1);
      realtime.scheduleChanged$.next('p1');
      expect(asked).toEqual([today, today]);
      expect(store.state()).toBe('ready');
    });

    it('reads again when a member leaves its Popkin', () => {
      store.open('p1', undefined, today);
      realtime.memberLeft$.next({ popkinId: 'p1', membershipId: 'm-walt' });
      expect(asked).toEqual([today, today]);
    });

    it('reads again when the connection comes back', () => {
      store.open('p1', undefined, today);
      realtime.reconnected$.next();
      expect(asked).toEqual([today, today]);
    });

    it('reads nothing before it is opened', () => {
      realtime.scheduleChanged$.next('p1');
      realtime.reconnected$.next();
      expect(asked).toEqual([]);
    });
  });
});
