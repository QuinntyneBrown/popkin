import { Injectable, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { MemberJoinedView, MessageView } from '../../models/chat';
import { HUB_EVENTS, HUB_URL, reconnectDelay } from './hub-events';
import { PopkinRealtime, RealtimeState } from './popkin-realtime';

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
  private readonly read = new Subject<string>();
  private readonly presence = new Subject<{ popkinId: string; version: number; hereNow: number }>();
  private readonly joined = new Subject<{ popkinId: string; member: MemberJoinedView }>();
  private readonly back = new Subject<void>();

  readonly state = this.status.asReadonly();
  readonly messageAdded$ = this.added.asObservable();
  readonly messageDeleted$ = this.deleted.asObservable();
  readonly threadRead$ = this.read.asObservable();
  readonly presenceChanged$ = this.presence.asObservable();
  readonly memberJoined$ = this.joined.asObservable();
  readonly reconnected$ = this.back.asObservable();

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
    connection.on(HUB_EVENTS.threadRead, (threadId: string) => this.read.next(threadId));
    connection.on(
      HUB_EVENTS.presenceChanged,
      (popkinId: string, version: number, hereNow: number) =>
        this.presence.next({ popkinId, version, hereNow }),
    );
    connection.on(HUB_EVENTS.memberJoined, (popkinId: string, member: MemberJoinedView) =>
      this.joined.next({ popkinId, member }),
    );
    connection.onreconnecting(() => this.status.set('reconnecting'));
    connection.onreconnected(() => {
      this.status.set('connected');
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
    void connection?.stop();
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
            this.status.set('connected');
            // Whatever happened while it was not connected was missed.
            if (tries > 0) this.back.next();
          },
          () => this.open(connection, tries + 1),
        );
      },
      tries === 0 ? 0 : reconnectDelay(tries),
    );
  }
}
