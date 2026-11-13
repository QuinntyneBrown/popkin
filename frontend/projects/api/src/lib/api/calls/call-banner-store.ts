import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { CallSession } from './call-session';
import { callBannerText } from './call-text';
import { CALLS_API } from './calls-api';

/** The banner of a group call under way (L2-029 AC2). */
export interface CallBanner {
  callId: string;
  /** "6 on the call", after "Group call". */
  text: string;
  /** "Return" for a member who is on the call and looking elsewhere (L2-030 AC7). */
  action: 'Join' | 'Return';
}

/**
 * Whether a Popkin has a group call under way, for the screens that show its banner: the
 * Popkin home and the Everyone thread. It follows the hub, so the banner appears when a call
 * starts and goes for everyone when the last person leaves (L2-029 AC6). One per screen.
 */
@Injectable()
export class CallBannerStore {
  private readonly api = inject(CALLS_API);
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly session = inject(CallSession);

  private popkinId = '';
  private reading?: Subscription;
  private listening?: Subscription;
  /** Calls that ended, so a change that arrives late does not bring one back. */
  private readonly over = new Set<string>();
  private readonly call = signal<{ id: string; version: number; count: number } | null>(null);

  readonly banner = computed<CallBanner | null>(() => {
    const call = this.call();
    if (!call) return null;
    return {
      callId: call.id,
      text: callBannerText(call.count),
      action: this.session.callId() === call.id ? 'Return' : 'Join',
    };
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.reading?.unsubscribe();
      this.listening?.unsubscribe();
    });
  }

  open(popkinId: string): void {
    this.popkinId = popkinId;
    this.listening?.unsubscribe();
    const listening = new Subscription();
    listening.add(
      this.realtime.callChanged$.subscribe((event) => {
        if (event.popkinId !== this.popkinId || this.over.has(event.callId)) return;
        const held = this.call();
        if (held?.id === event.callId && event.version <= held.version) return;
        this.call.set({ id: event.callId, version: event.version, count: event.participantCount });
      }),
    );
    listening.add(
      this.realtime.callEnded$.subscribe((event) => {
        if (event.popkinId !== this.popkinId) return;
        this.over.add(event.callId);
        if (this.call()?.id === event.callId) this.call.set(null);
      }),
    );
    listening.add(this.realtime.reconnected$.subscribe(() => this.read()));
    this.listening = listening;
    this.read();
  }

  private read(): void {
    this.reading?.unsubscribe();
    this.reading = this.api.getCurrent(this.popkinId).subscribe({
      next: (call) =>
        this.call.set(
          call ? { id: call.id, version: call.version, count: call.participantCount } : null,
        ),
      // A banner that cannot be read is not shown; the screen under it does not fail for it.
      error: () => this.call.set(null),
    });
  }
}
