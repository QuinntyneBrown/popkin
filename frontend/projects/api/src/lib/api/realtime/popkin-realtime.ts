import { InjectionToken, Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { MemberJoinedView, MessageView } from '../../models/chat';

export type RealtimeState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * What happens in a member's Popkins, as it happens (docs/detailed-designs/chat/live-messages).
 * One connection serves the whole app; an event says what changed and the screens that show
 * it apply it. After a drop, `reconnected$` tells them to read again what they missed.
 */
export interface PopkinRealtime {
  readonly state: Signal<RealtimeState>;
  readonly messageAdded$: Observable<MessageView>;
  readonly messageDeleted$: Observable<{ threadId: string; messageId: string }>;
  /** The member read this thread, here or on another device. */
  readonly threadRead$: Observable<string>;
  readonly presenceChanged$: Observable<{ popkinId: string; version: number; hereNow: number }>;
  readonly memberJoined$: Observable<{ popkinId: string; member: MemberJoinedView }>;
  /** Photos were added to a Popkin's album (L2-031 AC7). */
  readonly photosAdded$: Observable<{ popkinId: string; photoIds: string[] }>;
  readonly reconnected$: Observable<void>;
  /** Opens the connection if it is not open; safe to call from every screen that needs it. */
  start(): void;
  stop(): void;
}

export const POPKIN_REALTIME = new InjectionToken<PopkinRealtime>('PopkinRealtime');
