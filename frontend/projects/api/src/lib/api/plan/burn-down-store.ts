import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, filter, interval, merge } from 'rxjs';
import { BurnDownView } from '../../models/plan';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { burnChartOf } from './burn-chart';
import { PLAN_API } from './plan-api';
import { weekLabel } from '../schedule/schedule-weeks';
import {
  badgeLabel,
  burnHeadline,
  cardOf,
  chartText,
  daysBetween,
  forecastText,
} from './plan-text';

export type BurnDownState = 'loading' | 'ready' | 'empty' | 'error' | 'off' | 'not-found';

/**
 * The burn-down of one Popkin's sprint (L2-071): read when it opens, again each minute, so an
 * open burn-down follows the Plan switch within one (L2-077 AC4), and again when its plan changes
 * or the connection comes back (L2-068 AC12). It is empty before the first story, and while
 * nothing was ever in the sprint: "All done" means work was finished, and none was.
 */
@Injectable()
export class BurnDownStore {
  private readonly api = inject(PLAN_API);
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly destroyRef = inject(DestroyRef);

  private popkinId = '';
  private reading?: Subscription;
  private minute?: Subscription;

  readonly view = signal<BurnDownView | null>(null);
  readonly state = signal<BurnDownState>('loading');
  /** The sprint's days, "Aug 30 – Sep 26", under the heading (L2-071 AC1). */
  readonly sprintDays = computed(() => {
    const sprint = this.view()?.sprint;
    return sprint
      ? weekLabel(sprint.firstDay, daysBetween(sprint.firstDay, sprint.lastDay) + 1)
      : undefined;
  });
  /** "24 pts left" or "All done" (L2-071 AC2, AC3). */
  readonly headline = computed(() => burnHeadline(this.view()?.pointsLeft ?? 0));
  /** "7 behind", "3 ahead" or "On track"; none once all is done (L2-071 AC2). */
  readonly badge = computed(() => {
    const view = this.view();
    return view && view.pointsLeft > 0 ? badgeLabel(view.behind) : null;
  });
  /** "Finishes Sep 30 · 4 days late" and the rest (L2-071 AC3). */
  readonly forecast = computed(() => {
    const forecast = this.view()?.forecast;
    return forecast ? forecastText(forecast) : null;
  });
  readonly chart = computed(() => {
    const view = this.view();
    return view?.sprint ? burnChartOf(view, today()) : null;
  });
  /** The chart as text, for assistive technology (L2-071 AC5). */
  readonly chartText = computed(() => {
    const view = this.view();
    return view ? chartText(view) : '';
  });
  /** The three biggest stories still open, as cards show them (L2-071 AC6). */
  readonly biggest = computed(() => (this.view()?.biggest ?? []).map(cardOf));

  constructor() {
    merge(
      this.realtime.planChanged$.pipe(filter((changed) => changed.popkinId === this.popkinId)),
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

  retry(): void {
    this.view.set(null);
    this.read();
  }

  private read(): void {
    this.reading?.unsubscribe();
    if (!this.view()) this.state.set('loading');
    this.reading = this.api.burnDown(this.popkinId).subscribe({
      next: (view) => {
        this.view.set(view);
        this.state.set(emptyOf(view) ? 'empty' : 'ready');
      },
      error: (error: unknown) => this.state.set(failureOf(error)),
    });
  }
}

/** No sprint yet, or no point was ever in it (L2-071 AC8). */
function emptyOf(view: BurnDownView): boolean {
  return !view.sprint || (view.pointsLeft === 0 && view.days.every((d) => d.pointsLeft === 0));
}

/** Today in UTC, as the API counts days (L2-068). */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function failureOf(error: unknown): BurnDownState {
  if (!(error instanceof HttpErrorResponse) || error.status !== 404) return 'error';
  return (error.error as { code?: string } | null)?.code === 'feature_off' ? 'off' : 'not-found';
}
