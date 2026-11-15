import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BurnDownView } from '../../models/plan';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { PLAN_API } from './plan-api';
import { BurnDownStore } from './burn-down-store';

const realtime = {
  planChanged$: new Subject<{ popkinId: string; version: number }>(),
  reconnected$: new Subject<void>(),
  start() {
    /* the hub starts */
  },
};

const sprint = {
  name: 'Planning sprint',
  firstDay: '2026-08-30',
  lastDay: '2026-09-26',
  daysLeft: 14,
};

const noSprint: BurnDownView = {
  sprint: null,
  startPoints: 0,
  pointsLeft: 0,
  behind: 0,
  forecast: null,
  days: [],
  biggest: [],
};

const late: BurnDownView = {
  sprint,
  startPoints: 32,
  pointsLeft: 24,
  behind: 7,
  forecast: { kind: 'Late', date: '2026-09-30', days: 4 },
  days: [
    { day: '2026-08-30', pointsLeft: 32 },
    { day: '2026-08-31', pointsLeft: 24 },
  ],
  biggest: [],
};

describe('BurnDownStore', () => {
  type Answer = BurnDownView | 'down' | 'missing' | 'off';
  let answer: Answer;
  let reads: number;
  let store: BurnDownStore;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-08-31T15:00:00Z'));
    answer = late;
    reads = 0;
    const burnDown = (): Observable<BurnDownView> => {
      reads++;
      if (answer === 'down') return throwError(() => new HttpErrorResponse({ status: 500 }));
      if (answer === 'missing' || answer === 'off') {
        const code = answer === 'off' ? 'feature_off' : 'popkin_not_found';
        return throwError(() => new HttpErrorResponse({ status: 404, error: { code } }));
      }
      return of(answer);
    };
    TestBed.configureTestingModule({
      providers: [
        BurnDownStore,
        { provide: PLAN_API, useValue: { burnDown } },
        { provide: POPKIN_REALTIME, useValue: realtime },
      ],
    });
    store = TestBed.inject(BurnDownStore);
  });

  afterEach(() => vi.useRealTimers());

  it('is ready with the headline, the badge, the forecast and the chart (L2-071 AC2 to AC5)', () => {
    store.open('p1');

    expect(store.state()).toBe('ready');
    expect(store.sprintDays()).toBe('Aug 30 – Sep 26');
    expect(store.headline()).toBe('24 pts left');
    expect(store.badge()).toBe('7 behind');
    expect(store.forecast()).toBe('Finishes Sep 30 · 4 days late');
    expect(store.chart()?.today.label).toBe('24 left');
    expect(store.chartText()).toContain('24 points left, 7 behind.');
  });

  it('is empty with no stories yet (L2-071 AC8)', () => {
    answer = noSprint;
    store.open('p1');

    expect(store.state()).toBe('empty');
  });

  it('is empty while nothing was ever in the sprint, only ideas in Backlog', () => {
    answer = {
      ...late,
      startPoints: 0,
      pointsLeft: 0,
      behind: 0,
      days: late.days.map((d) => ({ ...d, pointsLeft: 0 })),
    };
    store.open('p1');

    expect(store.state()).toBe('empty');
  });

  it('is ready, "All done", once every point in the sprint is done (L2-071 AC3)', () => {
    answer = {
      ...late,
      pointsLeft: 0,
      behind: -9,
      forecast: { kind: 'Done', date: '2026-08-31', days: 26 },
      days: [late.days[0], { day: '2026-08-31', pointsLeft: 0 }],
    };
    store.open('p1');

    expect(store.state()).toBe('ready');
    expect(store.headline()).toBe('All done');
    expect(store.badge()).toBeNull();
    expect(store.forecast()).toBe('Finished Aug 31 · 26 days early');
  });

  it('is off while Plan is switched off, not found for someone who is not a member, and fails', () => {
    answer = 'off';
    store.open('p1');
    expect(store.state()).toBe('off');

    answer = 'missing';
    store.retry();
    expect(store.state()).toBe('not-found');

    answer = 'down';
    store.retry();
    expect(store.state()).toBe('error');

    answer = late;
    store.retry();
    expect(store.state()).toBe('ready');
  });

  it('reads again when its Popkin’s plan changes, and when the connection comes back (L2-068 AC12)', () => {
    store.open('p1');

    realtime.planChanged$.next({ popkinId: 'p2', version: 9 });
    expect(reads).toBe(1);
    realtime.planChanged$.next({ popkinId: 'p1', version: 9 });
    expect(reads).toBe(2);
    realtime.reconnected$.next();
    expect(reads).toBe(3);
  });

  it('reads itself each minute, so it follows the switch within one (L2-077 AC4)', () => {
    store.open('p1');

    vi.advanceTimersByTime(60_000);

    expect(reads).toBe(2);
  });
});
