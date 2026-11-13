import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';
import { AccountView } from '../../models/account';
import { SessionStore } from '../auth/session.store';
import { PhotoProblem } from '../invites/profile-photo';
import { toApiProblem } from '../problem';
import { ACCOUNT_API } from './account-api';

/** How long the account may take before the screen says it is loading (L2-056 AC1). */
export const ACCOUNT_LOADING_AFTER_MS = 300;

/**
 * The account screen (docs/detailed-designs/accounts/manage-account): the person's account, and
 * saving a new name or photo. One per screen; the page provides it.
 */
@Injectable()
export class AccountStore {
  private readonly api = inject(ACCOUNT_API);
  private readonly sessions = inject(SessionStore);
  private slow?: ReturnType<typeof setTimeout>;

  /** `pending` shows nothing yet; `loading` once 300 ms pass without an answer. */
  readonly state = signal<'pending' | 'loading' | 'ready' | 'error'>('pending');
  readonly account = signal<AccountView | null>(null);
  readonly saveState = signal<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  readonly nameInvalid = signal(false);
  readonly photoProblem = signal<PhotoProblem | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.slow));
  }

  load(): void {
    this.state.set('pending');
    clearTimeout(this.slow);
    this.slow = setTimeout(() => {
      if (this.state() === 'pending') this.state.set('loading');
    }, ACCOUNT_LOADING_AFTER_MS);
    this.api.getAccount().subscribe({
      next: (account) => {
        clearTimeout(this.slow);
        this.account.set(account);
        this.state.set('ready');
      },
      error: () => {
        clearTimeout(this.slow);
        this.state.set('error');
      },
    });
  }

  /**
   * Saves the trimmed name and, when one was picked, the photo, the photo first (L2-048 AC2).
   * An empty name saves nothing and is marked invalid (AC3).
   */
  save(typed: string, photo: File | null): void {
    const account = this.account();
    if (!account || this.saveState() === 'saving') return;
    const name = typed.trim();
    this.nameInvalid.set(name.length === 0);
    if (name.length === 0) {
      this.saveState.set('idle');
      return;
    }
    this.photoProblem.set(null);
    this.saveState.set('saving');
    const afterPhoto: Observable<AccountView> = photo ? this.api.changePhoto(photo) : of(account);
    afterPhoto
      .pipe(switchMap((saved) => (name === saved.name ? of(saved) : this.api.updateName(name))))
      .subscribe({
        next: (saved) => {
          this.account.set(saved);
          this.sessions.set({
            personId: saved.personId,
            name: saved.name,
            photoUrl: saved.photoUrl,
          });
          this.saveState.set('saved');
        },
        error: (error: unknown) => {
          const code = toApiProblem(error).code;
          if (code === 'photo_type_not_allowed' || code === 'photo_too_large') {
            this.photoProblem.set(code === 'photo_too_large' ? 'size' : 'type');
            this.saveState.set('idle');
          } else if (code === 'name_invalid') {
            this.nameInvalid.set(true);
            this.saveState.set('idle');
          } else {
            this.saveState.set('failed');
          }
        },
      });
  }

  /** Typing again after a save takes the "Saved just now" away. */
  edited(): void {
    if (this.saveState() === 'saved') this.saveState.set('idle');
  }
}
