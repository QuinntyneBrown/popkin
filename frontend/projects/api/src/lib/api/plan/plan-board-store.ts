import { HttpErrorResponse } from '@angular/common/http';
import { switchedOffBy } from '../popkins/feature-text';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, filter, interval, merge } from 'rxjs';
import { PlanBoardView, StoryView } from '../../models/plan';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { PLAN_API } from './plan-api';
import {
  burnHeadline,
  chipStatus,
  columnsOf,
  daysBetween,
  daysLeftLabel,
  sprintLine,
} from './plan-text';
import { sparklineOf } from './sparkline';

export type PlanBoardState = 'loading' | 'ready' | 'error' | 'off' | 'not-found';

/**
 * The plan board of one Popkin (L2-068): read when it opens, again each minute, so an open
 * board follows the Plan switch within one (L2-077 AC4), and again, quietly, when its plan
 * changes past the version it holds or the connection comes back (L2-068 AC12).
 */
@Injectable()
export class PlanBoardStore {
  private readonly api = inject(PLAN_API);
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly destroyRef = inject(DestroyRef);

  private popkinId = '';
  private reading?: Subscription;
  private minute?: Subscription;

  readonly view = signal<PlanBoardView | null>(null);
  readonly state = signal<PlanBoardState>('loading');
  /** Who switched the feature off while `state` is `off` (L2-077 AC2). */
  readonly offBy = signal<'Host' | 'Popkin'>('Popkin');
  /** The four columns with their cards (L2-068 AC3 to AC6). */
  readonly columns = computed(() => columnsOf(this.view()?.stories ?? []));
  /** A Popkin with no stories yet offers the four starters (L2-068 AC9). */
  readonly empty = computed(() => this.view()?.stories.length === 0);
  /** "Planning sprint · Aug 30 – Sep 26 · " and, in bold, "14 days left" (L2-068 AC2). */
  readonly sprint = computed(() => {
    const sprint = this.view()?.sprint;
    return sprint ? { line: sprintLine(sprint), daysLeft: daysLeftLabel(sprint.daysLeft) } : null;
  });
  /** The sprint chip: its sparkline, "24 pts left" and "7 behind"; none before a story (L2-068 AC7). */
  readonly chip = computed(() => {
    const view = this.view();
    const sprint = view?.sprint;
    const progress = view?.progress;
    if (!sprint || !progress) return null;
    return {
      headline: burnHeadline(progress.pointsLeft),
      status: progress.pointsLeft > 0 ? chipStatus(progress.behind) : null,
      sparkline: sparklineOf(progress.sparkline, daysBetween(sprint.firstDay, sprint.lastDay) + 1),
    };
  });

  constructor() {
    merge(
      this.realtime.planChanged$.pipe(
        filter((changed) => changed.popkinId === this.popkinId),
        filter((changed) => changed.version > (this.view()?.version ?? 0)),
      ),
      this.realtime.reconnected$,
    )
      .pipe(
        filter(() => !!this.popkinId),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.read());
  }

  open(popkinId: string): void {
    if (popkinId !== this.popkinId) this.view.set(null);
    this.popkinId = popkinId;
    this.realtime.start();
    this.minute ??= interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.read());
    this.read();
  }

  /** A story this member just added shows at once, last in its column (L2-069 AC5). */
  added(story: StoryView): void {
    this.view.update((view) => (view ? { ...view, stories: [...view.stories, story] } : view));
  }

  /** A story this member moved or changed shows at once, last in its column if it moved (L2-070 AC2, AC3). */
  moved(story: StoryView): void {
    this.view.update((view) => {
      if (!view) return view;
      const was = view.stories.find((s) => s.id === story.id);
      const others = view.stories.filter((s) => s.id !== story.id);
      if (was && was.column === story.column) {
        return { ...view, stories: view.stories.map((s) => (s.id === story.id ? story : s)) };
      }
      return { ...view, stories: [...others, story] };
    });
  }

  /** A story this member deleted goes from the board at once (L2-070 AC4). */
  removed(storyId: string): void {
    this.view.update((view) =>
      view ? { ...view, stories: view.stories.filter((s) => s.id !== storyId) } : view,
    );
  }

  retry(): void {
    this.view.set(null);
    this.read();
  }

  private read(): void {
    this.reading?.unsubscribe();
    if (!this.view()) this.state.set('loading');
    this.reading = this.api.board(this.popkinId).subscribe({
      next: (view) => {
        this.view.set(view);
        this.state.set('ready');
      },
      error: (error: unknown) => this.failed(error),
    });
  }

  private failed(error: unknown): void {
    this.offBy.set(switchedOffBy(error));
    this.state.set(failureOf(error));
  }
}

function failureOf(error: unknown): PlanBoardState {
  if (!(error instanceof HttpErrorResponse) || error.status !== 404) return 'error';
  return (error.error as { code?: string } | null)?.code === 'feature_off' ? 'off' : 'not-found';
}
