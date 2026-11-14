import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { messageLine } from './thread-text';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { AvatarView } from '../../models/invite';
import { ConversationsView, MessageView } from '../../models/chat';
import { toApiProblem } from '../problem';
import { unreadLabel } from '../popkins/my-popkins-text';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { CHAT_API } from './chat-api';
import { directLatest, rowTime } from './conversation-text';
import { UnreadTracker } from './unread-tracker';

/** The Everyone card of the Chat tab's list (L2-022 AC1). */
export interface EveryoneCard {
  threadId: string;
  latest: string;
  time: string;
  unread: number;
  unreadLabel: string | null;
}

/** A direct message in the Chat tab's list (L2-022 AC2). */
export interface ConversationRow {
  threadId: string;
  /** The other member's membership id: the address of the direct message. */
  memberId: string;
  name: string;
  avatar: AvatarView;
  latest: string;
  time: string;
  unread: boolean;
}

export type ConversationsState = 'loading' | 'ready' | 'error' | 'not-found';

/**
 * The member's threads in one Popkin (L2-022): Everyone first, then their direct messages, the
 * most recent first. A message that arrives changes its row and moves it up; the counts are
 * the unread tracker's, so a thread read here or elsewhere shows as read.
 */
@Injectable()
export class ConversationsStore {
  private readonly chat = inject(CHAT_API);
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly unread = inject(UnreadTracker);
  private readonly destroyRef = inject(DestroyRef);

  private readonly view = signal<ConversationsView | null>(null);
  private readonly phase = signal<ConversationsState>('loading');
  private readonly now = signal(new Date());
  private popkinId = '';

  readonly state = this.phase.asReadonly();

  readonly everyone = computed<EveryoneCard | null>(() => {
    const everyone = this.view()?.everyone;
    if (!everyone) return null;
    const latest = everyone.latest;
    const count = this.unread.forThread(everyone.threadId);
    return {
      threadId: everyone.threadId,
      latest: latest ? `${latest.firstName}: ${latest.text}` : 'No messages yet',
      time: latest ? rowTime(new Date(latest.sentAt), this.now()) : '',
      unread: count,
      unreadLabel: unreadLabel(count),
    };
  });

  readonly rows = computed<ConversationRow[]>(() =>
    (this.view()?.direct ?? []).map((thread) => ({
      threadId: thread.threadId,
      memberId: thread.other.membershipId,
      name: thread.other.displayName,
      avatar: thread.other.avatar,
      latest: directLatest(thread.latest),
      time: rowTime(new Date(thread.latest.sentAt), this.now()),
      unread: this.unread.forThread(thread.threadId) > 0,
    })),
  );

  constructor() {
    this.realtime.messageAdded$
      .pipe(takeUntilDestroyed())
      .subscribe((message) => this.onAdded(message));
    // A deleted message may have been a thread's latest, and nothing was heard while away.
    merge(this.realtime.messageDeleted$, this.realtime.reconnected$)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.view()) this.read(true);
      });
  }

  /** Reads the threads of a Popkin, and starts listening. */
  open(popkinId: string): void {
    this.popkinId = popkinId;
    this.view.set(null);
    this.read(false);
  }

  retry(): void {
    this.read(false);
  }

  private read(quietly: boolean): void {
    if (!quietly) this.phase.set('loading');
    const popkinId = this.popkinId;
    this.chat
      .listThreads(popkinId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (view) => {
          if (popkinId !== this.popkinId) return;
          this.now.set(new Date());
          for (const thread of [view.everyone, ...view.direct]) {
            this.unread.set({
              popkinId,
              threadId: thread.threadId,
              viewerMembershipId: view.viewerMembershipId,
              count: thread.unreadCount,
            });
          }
          this.view.set(view);
          this.phase.set('ready');
          this.realtime.start();
        },
        error: (error: unknown) => {
          // A quiet read that fails keeps what is shown.
          if (quietly) return;
          this.phase.set(toApiProblem(error).status === 404 ? 'not-found' : 'error');
        },
      });
  }

  private onAdded(message: MessageView): void {
    const view = this.view();
    if (!view || message.popkinId !== this.popkinId) return;
    this.now.set(new Date());
    const isMine = message.author.membershipId === view.viewerMembershipId;

    if (message.threadId === view.everyone.threadId) {
      // A note of the system ("Joel popped in") is not anybody's latest message.
      if (message.kind !== 'Member') return;
      const latest = {
        firstName: message.author.firstName,
        text: messageLine(message),
        isMine,
        sentAt: message.sentAt,
      };
      this.view.set({ ...view, everyone: { ...view.everyone, latest } });
      return;
    }

    const thread = view.direct.find((direct) => direct.threadId === message.threadId);
    if (!thread) {
      // A direct message that held nothing until now: the list has to be asked who it is with.
      this.read(true);
      return;
    }
    const moved = {
      ...thread,
      latest: { text: messageLine(message), isMine, sentAt: message.sentAt },
    };
    this.view.set({
      ...view,
      direct: [moved, ...view.direct.filter((direct) => direct !== thread)],
    });
  }
}
