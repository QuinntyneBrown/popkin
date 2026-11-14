import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toApiProblem, tryAgainIn } from '../problem';
import { INVITES_API } from './invites-api';
import { parseInviteInput } from './invite-input';

/**
 * `blank`: nothing typed. `not-found`: no Popkin has that code, or the text holds none (L2-015
 * AC6). `limited`: too many codes tried from this address (L2-053 AC3). `failed`: the lookup
 * did not answer.
 */
export type JoinCodeState =
  'idle' | 'blank' | 'finding' | 'found' | 'not-found' | 'limited' | 'failed';

/**
 * "Find my Popkin" on Join with a code (L2-015 AC5): finds the invite of a code typed or a link
 * pasted. One per screen.
 */
@Injectable()
export class JoinCode {
  private readonly api = inject(INVITES_API);
  private readonly origin = inject(DOCUMENT).location.origin;
  private readonly destroyRef = inject(DestroyRef);

  private readonly phase = signal<JoinCodeState>('idle');
  private readonly found = signal<string | null>(null);
  private readonly retry = signal('');

  readonly state = this.phase.asReadonly();
  /** The invite code that was found. */
  readonly code = this.found.asReadonly();
  /** When a refused person may try again: "Try again in 9 minutes." (L2-053 AC4). */
  readonly tryAgain = this.retry.asReadonly();

  /** Looks the text up; sent once while it looks (L2-056 AC3). */
  find(text: string): void {
    if (this.phase() === 'finding') return;
    if (!text.trim()) return this.phase.set('blank');
    const code = parseInviteInput(text, this.origin);
    // Text that holds no code is not asked about: no Popkin could have it.
    if (!code) return this.phase.set('not-found');
    this.phase.set('finding');
    this.api
      .getPreview(code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.found.set(code);
          this.phase.set('found');
        },
        error: (error: unknown) => {
          const problem = toApiProblem(error);
          if (problem.status === 404) return this.phase.set('not-found');
          if (problem.status === 429) {
            this.retry.set(tryAgainIn(problem.retryAfterSeconds));
            return this.phase.set('limited');
          }
          this.phase.set('failed');
        },
      });
  }

  /** The text changed: what was said about the last try no longer holds. */
  edit(): void {
    // A refusal for the rate holds whatever is typed; it goes when the next try is answered.
    const state = this.phase();
    if (state === 'blank' || state === 'not-found') this.phase.set('idle');
  }
}
