import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { INVITES_API } from './invites-api';
import { parseInviteInput } from './invite-input';

export type JoinCodeState = 'idle' | 'finding' | 'found';

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
    const code = parseInviteInput(text, this.origin);
    if (!code) return;
    this.phase.set('finding');
    this.api
      .getPreview(code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.found.set(code);
          this.phase.set('found');
        },
      });
  }
}
