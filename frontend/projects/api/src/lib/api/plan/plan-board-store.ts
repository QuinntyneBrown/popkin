import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, interval } from 'rxjs';
import { PlanBoardView } from '../../models/plan';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { PLAN_API } from './plan-api';

export type PlanBoardState = 'loading' | 'ready' | 'error' | 'off' | 'not-found';

/**
 * The plan board of one Popkin (L2-068): read when it opens, and again each minute, so an open
 * board follows the Plan switch within one (L2-077 AC4).
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
    this.reading = this.api.board(this.popkinId).subscribe({
      next: (view) => {
        this.view.set(view);
        this.state.set('ready');
      },
      error: (error: unknown) => this.state.set(failureOf(error)),
    });
  }
}

function failureOf(error: unknown): PlanBoardState {
  if (!(error instanceof HttpErrorResponse) || error.status !== 404) return 'error';
  return (error.error as { code?: string } | null)?.code === 'feature_off' ? 'off' : 'not-found';
}
