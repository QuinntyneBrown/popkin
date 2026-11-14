import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toApiProblem } from '../problem';
import { INVITES_API } from './invites-api';
import { parseInviteInput } from './invite-input';

/**
 * `blank`: nothing typed. `not-found`: no Popkin has that code, or the text holds none (L2-015
 * AC6).
 */
export type JoinCodeState = 'idle' | 'blank' | 'finding' | 'found' | 'not-found';

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

  readonly state = this.phase.asReadonly();
  /** The invite code that was found. */
  readonly code = this.found.asReadonly();

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
          if (toApiProblem(error).status === 404) this.phase.set('not-found');
        },
      });
  }

  /** The text changed: what was said about the last try no longer holds. */
  edit(): void {
    if (this.phase() !== 'finding') this.phase.set('idle');
  }
}
