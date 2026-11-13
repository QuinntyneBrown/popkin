import { Injectable, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { SessionView } from '../../models/auth';
import { AUTH_API } from './auth-api';

/**
 * Who is signed in on this device. `undefined` until loaded, then the session or `null`. The
 * session itself is an HttpOnly cookie the app never reads (L2-007 AC4).
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly auth = inject(AUTH_API);
  private readonly state = signal<SessionView | null | undefined>(undefined);
  private loading?: Promise<SessionView | null>;

  readonly session = this.state.asReadonly();

  /** Asks the API once and shares the answer; a 401 (or any failure) reads as signed out. */
  ensureLoaded(): Promise<SessionView | null> {
    const known = this.state();
    if (known !== undefined) return Promise.resolve(known);
    this.loading ??= firstValueFrom(
      this.auth.getSession().pipe(
        map((session): SessionView | null => session),
        catchError(() => of(null)),
      ),
    ).then((session) => {
      this.state.set(session);
      this.loading = undefined;
      return session;
    });
    return this.loading;
  }

  set(session: SessionView): void {
    this.state.set(session);
  }

  clear(): void {
    this.state.set(null);
  }
}
