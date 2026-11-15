import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanBoardView, StoryView } from '../../models/plan';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { PLAN_API } from './plan-api';
import { PlanBoardStore } from './plan-board-store';

const realtime = {
  planChanged$: new Subject<{ popkinId: string; version: number }>(),
  memberLeft$: new Subject<{ popkinId: string; membershipId: string }>(),
  reconnected$: new Subject<void>(),
  started: 0,
  start() {
    this.started++;
  },
};

const empty: PlanBoardView = { sprint: null, stories: [], progress: null, version: 0 };

describe('PlanBoardStore', () => {
  type Answer = PlanBoardView | 'down' | 'missing' | 'off' | Subject<PlanBoardView>;
  let answer: Answer;
  let reads: number;
  let store: PlanBoardStore;

  beforeEach(() => {
    answer = empty;
    reads = 0;
    const board = (): Observable<PlanBoardView> => {
      reads++;
      if (answer === 'down') return throwError(() => new HttpErrorResponse({ status: 500 }));
      if (answer === 'missing' || answer === 'off') {
        const code = answer === 'off' ? 'feature_off' : 'popkin_not_found';
        return throwError(() => new HttpErrorResponse({ status: 404, error: { code } }));
      }
      return answer instanceof Subject ? answer : of(answer);
    };
    TestBed.configureTestingModule({
      providers: [
        PlanBoardStore,
        { provide: PLAN_API, useValue: { board } },
        { provide: POPKIN_REALTIME, useValue: realtime },
      ],
    });
    store = TestBed.inject(PlanBoardStore);
  });

  afterEach(() => vi.useRealTimers());

  it('has a sprint chip while the sprint has stories, and none before (L2-068 AC7)', () => {
    store.open('p1');
    expect(store.chip()).toBeNull();

    answer = {
      ...empty,
      sprint: {
        name: 'Planning sprint',
        firstDay: '2026-08-30',
        lastDay: '2026-09-26',
        daysLeft: 14,
      },
      progress: { pointsLeft: 24, behind: 7, sparkline: [32, 24] },
    };
    store.retry();

    expect(store.chip()).toEqual({
      headline: '24 pts left',
      status: '7 behind',
      sparkline: { line: 'M0.0,1.9 L1.6,6.9', ideal: { y1: 1.9, y2: 22 } },
    });
  });

  it('says "All done" on the chip, with no status, once nothing is left', () => {
    answer = {
      ...empty,
      sprint: {
        name: 'Planning sprint',
        firstDay: '2026-08-30',
        lastDay: '2026-09-26',
        daysLeft: 9,
      },
      progress: { pointsLeft: 0, behind: -9, sparkline: [32, 0] },
    };
    store.open('p1');

    expect(store.chip()?.headline).toBe('All done');
    expect(store.chip()?.status).toBeNull();
  });

  it('is loading until the board answers', () => {
    answer = new Subject<PlanBoardView>();
    store.open('p1');
    expect(store.state()).toBe('loading');
  });

  it('is ready once the board answers', () => {
    store.open('p1');
    expect(store.state()).toBe('ready');
  });

  it('is off while Plan is switched off (L2-077 AC2)', () => {
    answer = 'off';
    store.open('p1');
    expect(store.state()).toBe('off');
  });

  it('is not found for someone who is not a member (L2-051)', () => {
    answer = 'missing';
    store.open('p1');
    expect(store.state()).toBe('not-found');
  });

  it('fails, and tries again (L2-068 AC11)', () => {
    answer = 'down';
    store.open('p1');
    expect(store.state()).toBe('error');

    answer = empty;
    store.retry();
    expect(store.state()).toBe('ready');
  });

  it('reads itself each minute, so it follows the switch within one (L2-077 AC4)', () => {
    vi.useFakeTimers();
    store.open('p1');
    expect(reads).toBe(1);

    answer = 'off';
    vi.advanceTimersByTime(60_000);

    expect(reads).toBe(2);
    expect(store.state()).toBe('off');
  });

  it('shows a story it added last in its column at once (L2-069 AC5)', () => {
    const story = (id: string, column: StoryView['column']): StoryView => ({
      id,
      title: id,
      column,
      points: 2,
      tag: 'Travel',
      owner: null,
      dueDate: null,
      commentCount: 0,
      addedByMembershipId: 'm1',
      canDelete: true,
      addedAt: '2026-09-12T09:00:00Z',
    });
    answer = { ...empty, stories: [story('Van', 'ToDo'), story('Kayak', 'Backlog')] };
    store.open('p1');

    store.added(story('Packing list', 'ToDo'));

    expect(store.columns()[1].stories.map((s) => s.title)).toEqual(['Van', 'Packing list']);
    expect(store.empty()).toBe(false);
  });

  it('shows a story it moved last in its new column at once (L2-070 AC2)', () => {
    const story = (id: string, column: StoryView['column']): StoryView => ({
      id,
      title: id,
      column,
      points: 2,
      tag: 'Travel',
      owner: null,
      dueDate: null,
      commentCount: 0,
      addedByMembershipId: 'm1',
      canDelete: true,
      addedAt: '2026-09-12T09:00:00Z',
    });
    answer = {
      ...empty,
      stories: [story('Van', 'ToDo'), story('Cabin', 'Doing'), story('Kayak', 'Doing')],
    };
    store.open('p1');

    store.moved(story('Van', 'Doing'));

    expect(store.columns()[1].stories).toEqual([]);
    expect(store.columns()[2].stories.map((s) => s.title)).toEqual(['Cabin', 'Kayak', 'Van']);
  });

  it('drops a story it deleted at once (L2-070 AC4)', () => {
    const story = (id: string, column: StoryView['column']): StoryView => ({
      id,
      title: id,
      column,
      points: 2,
      tag: 'Travel',
      owner: null,
      dueDate: null,
      commentCount: 0,
      addedByMembershipId: 'm1',
      canDelete: true,
      addedAt: '2026-09-12T09:00:00Z',
    });
    answer = { ...empty, stories: [story('Van', 'ToDo'), story('Cabin', 'ToDo')] };
    store.open('p1');

    store.removed('Van');

    expect(store.columns()[1].stories.map((s) => s.title)).toEqual(['Cabin']);
  });

  describe('live (L2-068 AC12)', () => {
    it('reads again when the plan of its Popkin changes past the version it holds', () => {
      answer = { ...empty, version: 3 };
      store.open('p1');

      realtime.planChanged$.next({ popkinId: 'p1', version: 4 });

      expect(reads).toBe(2);
    });

    it('drops a change it already holds, or one of another Popkin', () => {
      answer = { ...empty, version: 3 };
      store.open('p1');

      realtime.planChanged$.next({ popkinId: 'p1', version: 3 });
      realtime.planChanged$.next({ popkinId: 'p1', version: 2 });
      realtime.planChanged$.next({ popkinId: 'p2', version: 9 });

      expect(reads).toBe(1);
    });

    it('reads again when the connection comes back', () => {
      store.open('p1');

      realtime.reconnected$.next();

      expect(reads).toBe(2);
    });

    it('keeps the board it shows while it reads again', () => {
      const later = new Subject<PlanBoardView>();
      answer = { ...empty, version: 3 };
      store.open('p1');
      answer = later;

      realtime.planChanged$.next({ popkinId: 'p1', version: 4 });

      expect(store.state()).toBe('ready');
      expect(store.view()?.version).toBe(3);
    });
  });
});
