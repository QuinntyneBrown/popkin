import { DestroyRef, inject, signal } from '@angular/core';

/** How long a read may take before the screen says it is loading (L2-056 AC1). */
export const LOADING_AFTER_MS = 300;

/** `pending` shows nothing yet; `loading` once the wait passes without an answer. */
export type LoadState = 'pending' | 'loading' | 'ready' | 'error';

/**
 * The wait before a screen says it is loading (L2-056 AC1): a quick read shows nothing until it
 * is ready, and a slow one shows its skeleton once 300 ms pass. It is the timer of the designed
 * `screenLoad()` (docs/detailed-designs/reliability/loading-failure-offline, known gap 24). Made
 * in an injection context: it stops its timer when its screen is destroyed.
 */
export class DelayedLoading {
  private readonly phase = signal<LoadState>('pending');
  private slow?: ReturnType<typeof setTimeout>;

  readonly state = this.phase.asReadonly();

  constructor(private readonly afterMs = LOADING_AFTER_MS) {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.slow));
  }

  /** A read starts: nothing shows until it is slow. */
  begin(): void {
    this.phase.set('pending');
    clearTimeout(this.slow);
    this.slow = setTimeout(() => {
      if (this.phase() === 'pending') this.phase.set('loading');
    }, this.afterMs);
  }

  ready(): void {
    this.settle('ready');
  }

  failed(): void {
    this.settle('error');
  }

  private settle(state: 'ready' | 'error'): void {
    clearTimeout(this.slow);
    this.phase.set(state);
  }
}
