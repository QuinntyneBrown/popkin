import { signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Closable, ConfirmDialogState } from '../../dialogs/confirm-dialog-state';

/** Whether an action needs a reason for the audit log (L2-087). */
export type ReasonPolicy = 'Required' | 'Optional';

/** The most characters a reason may have (L2-087 AC6). */
export const REASON_MAX_LENGTH = 500;

const REASON_REQUIRED = 'Give a reason; it goes in the audit log.';
const REASON_TOO_LONG = `Keep the reason to ${REASON_MAX_LENGTH} characters.`;

/**
 * One action dialog's state (docs/detailed-designs/admin-access/give-a-reason): the reason, the
 * one send while busy, and what a failure was. The reason is kept as typed after a failure. It is
 * a confirmation dialog's state (ADR 0029) with a reason for the audit log.
 */
export class ActionDialogState extends ConfirmDialogState {
  readonly reasonError = signal<string | null>(null);

  constructor(
    private readonly policy: ReasonPolicy,
    ref?: Closable,
  ) {
    super(ref);
  }

  /** Sends once; resolves the answer, or `undefined` when nothing was sent or it failed. */
  async confirm<T>(
    reason: string,
    send: (reason: string | null) => Observable<T>,
  ): Promise<T | undefined> {
    if (this.busy()) return undefined;
    const trimmed = reason.trim();
    if (this.policy === 'Required' && !trimmed) {
      this.reasonError.set(REASON_REQUIRED);
      return undefined;
    }
    this.reasonError.set(null);
    let answer: T | undefined;
    const sent = await this.send(
      () => send(trimmed || null).pipe(tap((value) => (answer = value))),
      (problem) => {
        if (problem.code === 'reason_required') this.reasonError.set(REASON_REQUIRED);
        else if (problem.code === 'reason_too_long') this.reasonError.set(REASON_TOO_LONG);
        else return 'failed';
        return 'idle';
      },
    );
    return sent ? answer : undefined;
  }
}
