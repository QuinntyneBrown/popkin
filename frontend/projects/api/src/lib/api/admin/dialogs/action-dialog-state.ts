import { signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiProblem, toApiProblem } from '../../problem';

/** Whether an action needs a reason for the audit log (L2-087). */
export type ReasonPolicy = 'Required' | 'Optional';

/** The most characters a reason may have (L2-087 AC6). */
export const REASON_MAX_LENGTH = 500;

/**
 * One action dialog's state (docs/detailed-designs/admin-access/give-a-reason): the reason, the
 * one send while busy, and what a failure was. The reason is kept as typed after a failure.
 */
export class ActionDialogState {
  readonly status = signal<'idle' | 'busy' | 'failed'>('idle');
  readonly reasonError = signal<string | null>(null);
  readonly failure = signal<ApiProblem | null>(null);

  constructor(private readonly policy: ReasonPolicy) {}

  /** Sends once; resolves the answer, or `undefined` when nothing was sent or it failed. */
  async confirm<T>(
    reason: string,
    send: (reason: string | null) => Observable<T>,
  ): Promise<T | undefined> {
    if (this.status() === 'busy') return undefined;
    const trimmed = reason.trim();
    if (this.policy === 'Required' && !trimmed) {
      this.reasonError.set('Give a reason; it goes in the audit log.');
      return undefined;
    }
    this.reasonError.set(null);
    this.failure.set(null);
    this.status.set('busy');
    try {
      const answer = await firstValueFrom(send(trimmed || null), { defaultValue: undefined as T });
      this.status.set('idle');
      return answer;
    } catch (error: unknown) {
      const problem = toApiProblem(error);
      if (problem.code === 'reason_required' || problem.code === 'reason_too_long') {
        this.reasonError.set(
          problem.code === 'reason_required'
            ? 'Give a reason; it goes in the audit log.'
            : `Keep the reason to ${REASON_MAX_LENGTH} characters.`,
        );
        this.status.set('idle');
        return undefined;
      }
      this.failure.set(problem);
      this.status.set('failed');
      return undefined;
    }
  }
}
