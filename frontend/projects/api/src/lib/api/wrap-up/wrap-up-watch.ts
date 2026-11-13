import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, interval, merge } from 'rxjs';
import { POPKINS_API } from '../popkins/popkins-api';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { wrapUpWarning } from './wrap-up-text';

const TICK_MS = 30_000;

/**
 * Tells the app that a Popkin wrapped up while it was open (L2-044 AC4). The hub says so when
 * its Host wraps it up. Nothing says so when its time runs out, since the Worker holds no
 * connection (ADR 0015): once the end of the Popkin being looked at has passed, the Popkin
 * is read every 30 seconds until it has wrapped up. A screen whose request was refused
 * because the Popkin had wrapped up reports it here too.
 */
@Injectable({ providedIn: 'root' })
export class WrapUpWatch {
  private readonly popkins = inject(POPKINS_API);
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly reported = new Subject<string>();
  private looking: { popkinId: string; endsAt: number } | null = null;
  /** Counts the ticks, so that what reads the time is drawn again. */
  private readonly ticks = signal(0);
  /** Popkins whose warning was dismissed; forgotten when the app is loaded again. */
  private readonly dismissed = signal<readonly string[]>([]);

  /** The id of a Popkin that has just wrapped up. */
  readonly wrappedUp$: Observable<string> = merge(
    this.realtime.popkinWrappedUp$,
    this.reported.asObservable(),
  );

  constructor() {
    interval(TICK_MS).subscribe(() => {
      this.ticks.update((ticks) => ticks + 1);
      this.check();
    });
  }

  /**
   * The active Popkin on the screen and when it ends, from the screen that read it; null for
   * none, and a null end for one that keeps going.
   */
  look(popkinId: string | null, endsAt: string | null): void {
    this.looking = popkinId && endsAt ? { popkinId, endsAt: new Date(endsAt).getTime() } : null;
  }

  /**
   * The banner of a Popkin's last hour (L2-044 AC2), redrawn as the time goes; null with more
   * than an hour left and once the member dismissed it.
   */
  warningFor(
    popkinId: string,
    name: string,
    endsAt: string | null,
  ): { lead: string; text: string } | null {
    this.ticks();
    return this.dismissed().includes(popkinId) ? null : wrapUpWarning(name, endsAt, new Date());
  }

  dismissWarning(popkinId: string): void {
    this.dismissed.update((ids) => [...ids, popkinId]);
  }

  report(popkinId: string): void {
    if (this.looking?.popkinId === popkinId) this.looking = null;
    this.reported.next(popkinId);
  }

  private check(): void {
    const looking = this.looking;
    if (!looking || Date.now() <= looking.endsAt) return;
    this.popkins.getHome(looking.popkinId).subscribe({
      next: (popkin) => {
        if (popkin.status === 'WrappedUp') this.report(looking.popkinId);
      },
      // Tried again on the next tick.
      error: () => undefined,
    });
  }
}
