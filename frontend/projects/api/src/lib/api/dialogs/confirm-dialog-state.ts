import { computed, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiProblem, toApiProblem } from '../problem';

/** What a dialog's ref lets the state hold shut; the CDK `DialogRef` has it. */
export interface Closable {
  disableClose: boolean | undefined;
}

/** What a dialog makes of a problem: it failed, it is done all the same, or it shows it elsewhere. */
export type ProblemOutcome = 'failed' | 'done' | 'idle';

/**
 * A confirmation dialog's state (docs/adr/0029-one-library-no-unused-components.md): the one
 * request it sends after "Delete", "Leave" or "Sign out", busy while it goes (L2-056 AC3), and
 * what a failure was. While busy its dialog cannot be closed by Escape, its backdrop or its close
 * (L2-056 AC8); the dialog disables its cancel button with `busy`.
 */
export class ConfirmDialogState {
  readonly status = signal<'idle' | 'busy' | 'failed'>('idle');
  readonly failure = signal<ApiProblem | null>(null);
  readonly busy = computed(() => this.status() === 'busy');
  readonly failed = computed(() => this.status() === 'failed');

  constructor(private readonly ref?: Closable) {}

  /**
   * Sends once; resolves true when it went through and false when nothing was sent or it did
   * not. `outcome` decides what a problem means; by default it is a failure.
   */
  async send(
    request: () => Observable<unknown>,
    outcome: (problem: ApiProblem) => ProblemOutcome = () => 'failed',
  ): Promise<boolean> {
    if (this.busy()) return false;
    this.failure.set(null);
    this.status.set('busy');
    this.hold(true);
    try {
      await firstValueFrom(request(), { defaultValue: undefined });
      this.status.set('idle');
      return true;
    } catch (error: unknown) {
      const problem = toApiProblem(error);
      const made = outcome(problem);
      if (made === 'failed') this.failure.set(problem);
      this.status.set(made === 'failed' ? 'failed' : 'idle');
      return made === 'done';
    } finally {
      this.hold(false);
    }
  }

  private hold(shut: boolean): void {
    if (this.ref) this.ref.disableClose = shut;
  }
}
