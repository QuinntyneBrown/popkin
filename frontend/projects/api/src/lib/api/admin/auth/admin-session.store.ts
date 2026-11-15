import { Injectable, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { AdminAction, AdminMe } from '../../../models/admin';
import { actionBlockedReason } from '../access/admin-permissions';
import { ADMIN_AUTH_API } from './admin-auth-api';

/**
 * The admin signed in to the console. `undefined` until read, then the admin or `null`. It is read
 * again before every page, so a changed role shows on the next page (L2-086 AC5) and a removed
 * admin meets 401 at the next navigation (L2-078 AC7).
 */
@Injectable({ providedIn: 'root' })
export class AdminSessionStore {
  private readonly auth = inject(ADMIN_AUTH_API);
  private readonly state = signal<AdminMe | null | undefined>(undefined);

  readonly me = this.state.asReadonly();

  /** Reads the admin; a 401, or any failure, reads as signed out. */
  load(): Promise<AdminMe | null> {
    return firstValueFrom(
      this.auth.me().pipe(
        map((me): AdminMe | null => me),
        catchError(() => of(null)),
      ),
    ).then((me) => {
      this.state.set(me);
      return me;
    });
  }

  /** Whether the signed-in admin's role allows `action` (L2-086). */
  allows(action: AdminAction): boolean {
    return this.state()?.allowed.includes(action) ?? false;
  }

  /** Why the signed-in admin cannot take `action`, or `null` when they can (L2-086 AC2). */
  blockedReason(action: AdminAction): string | null {
    const me = this.state();
    return actionBlockedReason(me?.role, me?.allowed ?? [], action);
  }

  set(me: AdminMe): void {
    this.state.set(me);
  }

  clear(): void {
    this.state.set(null);
  }

  /** Ends the admin session; the console is left signed out even when the API cannot be reached. */
  signOut(): Promise<void> {
    return firstValueFrom(this.auth.signOut().pipe(catchError(() => of(undefined)))).then(() =>
      this.clear(),
    );
  }
}
