import { InjectionToken, Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { CallParticipantView, CallSignal } from '../../models/calls';
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
  /** Someone left a Popkin (L2-047 AC2); the one who left is not told. */
  readonly memberLeft$: Observable<{ popkinId: string; membershipId: string }>;
  /** A Popkin wrapped up, by its Host; the id of the Popkin (L2-044 AC4). */
  readonly popkinWrappedUp$: Observable<string>;
  /** Photos were added to a Popkin's album (L2-031 AC7). */
  readonly photosAdded$: Observable<{ popkinId: string; photoIds: string[] }>;
  /**
   * Who is on a call changed; `version` orders these (L2-029 AC2). `threadId` is the direct
   * message of a call between two members, which only those two hear of (L2-030 AC8), and
   * null for the Popkin's group call.
   */
  readonly callChanged$: Observable<{
    popkinId: string;
    callId: string;
    version: number;
    participantCount: number;
    threadId: string | null;
  }>;
  /** The last person left a call (L2-029 AC6). */
  readonly callEnded$: Observable<{ popkinId: string; callId: string; threadId: string | null }>;
  /** Heard only by those on the call, once `joinCall` succeeded. */
  readonly participantJoined$: Observable<{ callId: string; participant: CallParticipantView }>;
  readonly participantLeft$: Observable<{ callId: string; membershipId: string }>;
  readonly participantMediaChanged$: Observable<{
    callId: string;
    membershipId: string;
    mediaVersion: number;
    micOn: boolean;
    cameraOn: boolean;
  }>;
  /** A step of setting up media, sent by someone on the call to this member alone. */
  readonly signal$: Observable<{ callId: string; fromMembershipId: string; signal: CallSignal }>;
  readonly reconnected$: Observable<void>;
  /** Opens the connection if it is not open; safe to call from every screen that needs it. */
  start(): void;
  stop(): void;
  /**
   * Puts this connection on a call the member has joined, so it hears the call's events. It
   * waits for the connection, and fails with the refusal's `code` (`call_not_found`).
   */
  joinCall(callId: string): Promise<void>;
  /** Sends a step of setting up media to one person on the call. Fails when it is refused. */
  sendSignal(callId: string, toMembershipId: string, signal: CallSignal): Promise<void>;
}

export const POPKIN_REALTIME = new InjectionToken<PopkinRealtime>('PopkinRealtime');
