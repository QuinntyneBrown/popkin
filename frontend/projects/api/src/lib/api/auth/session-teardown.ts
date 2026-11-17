import { ViewportScroller } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { POPKINS_SNAPSHOT } from '../popkins/popkins-snapshot';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { SessionStore } from './session.store';

/**
 * The end of a session on this device (L2-054, ADR 0029): signing out, deleting the account and
 * a session that ended under a screen (a 401) all close the live connection and forget the
 * person and their saved list of My Popkins, here and only here.
 */
@Injectable({ providedIn: 'root' })
export class SessionTeardown {
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly sessions = inject(SessionStore);
  private readonly snapshot = inject(POPKINS_SNAPSHOT);
  private readonly router = inject(Router);
  private readonly scroller = inject(ViewportScroller);

  /** Closes the live connection and forgets the person on this device. */
  forget(): void {
    this.realtime.stop();
    this.sessions.clear();
    // Nothing of the person stays on a device they are signed out of (L2-054).
    this.snapshot.clear();
  }

  /** Forgets the person, then opens `url` at its top, not where the last screen was scrolled to. */
  async end(url: string): Promise<void> {
    this.forget();
    await this.router.navigateByUrl(url);
    this.scroller.scrollToPosition([0, 0]);
  }
}
