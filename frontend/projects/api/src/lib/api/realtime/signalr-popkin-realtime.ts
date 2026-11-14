import { Injectable, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { CallParticipantView, CallSignal } from '../../models/calls';
import { MemberJoinedView, MessageView, ReactionSummary } from '../../models/chat';
import { PopkinSettingsView } from '../../models/popkin';
import { HUB_EVENTS, HUB_METHODS, HUB_URL, reconnectDelay } from './hub-events';
import { PopkinRealtime, RealtimeState } from './popkin-realtime';

/** What one of the client's streams of events carries. */
type Of<K extends keyof PopkinRealtime> = PopkinRealtime[K] extends Observable<infer V> ? V : never;

/**
 * `PopkinRealtime` over SignalR. A lost connection is tried again after 0, 2, 10 and 30 seconds
 * and then every 30 seconds without limit: a tab left open at a campsite comes back by itself.
 */
@Injectable()
export class SignalRPopkinRealtime implements PopkinRealtime {
  private readonly status = signal<RealtimeState>('disconnected');
  private connection?: HubConnection;
  private retry?: ReturnType<typeof setTimeout>;

  private readonly added = new Subject<MessageView>();
  private readonly deleted = new Subject<{ threadId: string; messageId: string }>();
  private readonly reactions = new Subject<Of<'reactionsChanged$'>>();
  private readonly read = new Subject<string>();
  private readonly presence = new Subject<{ popkinId: string; version: number; hereNow: number }>();
  private readonly joined = new Subject<{ popkinId: string; member: MemberJoinedView }>();
  private readonly left = new Subject<Of<'memberLeft$'>>();
  private readonly photos = new Subject<{ popkinId: string; photoIds: string[] }>();
  private readonly photoGone = new Subject<{ popkinId: string; photoId: string }>();
  private readonly wrapped = new Subject<string>();
  private readonly changed = new Subject<PopkinSettingsView>();
  private readonly back = new Subject<void>();
  private readonly callChange = new Subject<Of<'callChanged$'>>();
  private readonly callEnd = new Subject<Of<'callEnded$'>>();
  private readonly onCall = new Subject<Of<'participantJoined$'>>();
  private readonly offCall = new Subject<Of<'participantLeft$'>>();
  private readonly media = new Subject<Of<'participantMediaChanged$'>>();
  private readonly signals = new Subject<Of<'signal$'>>();
  /** Calls waiting for the connection. */
  private waiting: (() => void)[] = [];

  readonly state = this.status.asReadonly();
  readonly messageAdded$ = this.added.asObservable();
  readonly messageDeleted$ = this.deleted.asObservable();
  readonly reactionsChanged$ = this.reactions.asObservable();
  readonly threadRead$ = this.read.asObservable();
  readonly presenceChanged$ = this.presence.asObservable();
  readonly memberJoined$ = this.joined.asObservable();
  readonly memberLeft$ = this.left.asObservable();
  readonly photosAdded$ = this.photos.asObservable();
  readonly photoDeleted$ = this.photoGone.asObservable();
  readonly popkinWrappedUp$ = this.wrapped.asObservable();
  readonly popkinChanged$ = this.changed.asObservable();
  readonly reconnected$ = this.back.asObservable();
  readonly callChanged$ = this.callChange.asObservable();
  readonly callEnded$ = this.callEnd.asObservable();
  readonly participantJoined$ = this.onCall.asObservable();
  readonly participantLeft$ = this.offCall.asObservable();
  readonly participantMediaChanged$ = this.media.asObservable();
  readonly signal$ = this.signals.asObservable();

  start(): void {
    if (this.connection) return;
    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (context) => reconnectDelay(context.previousRetryCount),
      })
      .configureLogging(LogLevel.None)
      .build();
    this.connection = connection;

    connection.on(HUB_EVENTS.messageAdded, (message: MessageView) => this.added.next(message));
    connection.on(HUB_EVENTS.messageDeleted, (threadId: string, messageId: string) =>
      this.deleted.next({ threadId, messageId }),
    );
    connection.on(
      HUB_EVENTS.reactionsChanged,
      (threadId: string, messageId: string, version: number, reactions: ReactionSummary[]) =>
        this.reactions.next({ threadId, messageId, version, reactions }),
    );
    connection.on(HUB_EVENTS.threadRead, (threadId: string) => this.read.next(threadId));
    connection.on(
      HUB_EVENTS.presenceChanged,
      (popkinId: string, version: number, hereNow: number) =>
        this.presence.next({ popkinId, version, hereNow }),
    );
    connection.on(HUB_EVENTS.memberJoined, (popkinId: string, member: MemberJoinedView) =>
      this.joined.next({ popkinId, member }),
    );
    connection.on(HUB_EVENTS.memberLeft, (popkinId: string, membershipId: string) =>
      this.left.next({ popkinId, membershipId }),
    );
    connection.on(HUB_EVENTS.photosAdded, (popkinId: string, photoIds: string[]) =>
      this.photos.next({ popkinId, photoIds }),
    );
    connection.on(HUB_EVENTS.photoDeleted, (popkinId: string, photoId: string) =>
      this.photoGone.next({ popkinId, photoId }),
    );
    connection.on(
      HUB_EVENTS.callChanged,
      (
        popkinId: string,
        callId: string,
        version: number,
        participantCount: number,
        threadId?: string | null,
      ) =>
        this.callChange.next({
          popkinId,
          callId,
          version,
          participantCount,
          threadId: threadId ?? null,
        }),
    );
    connection.on(
      HUB_EVENTS.callEnded,
      (popkinId: string, callId: string, threadId?: string | null) =>
        this.callEnd.next({ popkinId, callId, threadId: threadId ?? null }),
    );
    connection.on(
      HUB_EVENTS.participantJoined,
      (callId: string, participant: CallParticipantView) =>
        this.onCall.next({ callId, participant }),
    );
    connection.on(HUB_EVENTS.participantLeft, (callId: string, membershipId: string) =>
      this.offCall.next({ callId, membershipId }),
    );
    connection.on(
      HUB_EVENTS.participantMediaChanged,
      (
        callId: string,
        membershipId: string,
        mediaVersion: number,
        micOn: boolean,
        cameraOn: boolean,
      ) => this.media.next({ callId, membershipId, mediaVersion, micOn, cameraOn }),
    );
    connection.on(
      HUB_EVENTS.signal,
      (callId: string, fromMembershipId: string, signal: CallSignal) =>
        this.signals.next({ callId, fromMembershipId, signal }),
    );
    connection.on(HUB_EVENTS.popkinWrappedUp, (popkinId: string) => this.wrapped.next(popkinId));
    connection.on(HUB_EVENTS.popkinChanged, (_popkinId: string, popkin: PopkinSettingsView) =>
      this.changed.next(popkin),
    );
    connection.onreconnecting(() => this.status.set('reconnecting'));
    connection.onreconnected(() => {
      this.connected();
      this.back.next();
    });
    // Automatic reconnection gave up, or the server closed the connection: begin again.
    connection.onclose(() => {
      if (this.connection === connection) this.open(connection, 1);
    });

    this.open(connection, 0);
  }

  stop(): void {
    const connection = this.connection;
    this.connection = undefined;
    clearTimeout(this.retry);
    this.status.set('disconnected');
    this.waiting.splice(0).forEach((resume) => resume());
    void connection?.stop();
  }

  async joinCall(callId: string): Promise<void> {
    await (await this.ready()).invoke(HUB_METHODS.joinCall, callId);
  }

  async sendSignal(callId: string, toMembershipId: string, signal: CallSignal): Promise<void> {
    // Invoked, not sent: a refused signal must be known, or a call would never connect.
    await (await this.ready()).invoke(HUB_METHODS.sendSignal, callId, toMembershipId, signal);
  }

  private connected(): void {
    this.status.set('connected');
    this.waiting.splice(0).forEach((resume) => resume());
  }

  /** The connection, once it is up. */
  private async ready(): Promise<HubConnection> {
    this.start();
    while (this.connection?.state !== HubConnectionState.Connected) {
      if (!this.connection) throw new Error('The connection was stopped.');
      await new Promise<void>((resume) => this.waiting.push(resume));
    }
    return this.connection;
  }

  /** The first connection is not retried by the client itself, so it is here, on the same waits. */
  private open(connection: HubConnection, tries: number): void {
    this.status.set(tries === 0 ? 'connecting' : 'reconnecting');
    this.retry = setTimeout(
      () => {
        if (this.connection !== connection) return;
        if (connection.state !== HubConnectionState.Disconnected) return;
        connection.start().then(
          () => {
            this.connected();
            // The server answers before it has put the connection in its Popkins' groups, and
            // nothing was heard while it was not connected: the screens read again what they show.
            this.back.next();
          },
          () => this.open(connection, tries + 1),
        );
      },
      tries === 0 ? 0 : reconnectDelay(tries),
    );
  }
}
