import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Observable,
  Subject,
  expand,
  firstValueFrom,
  last,
  map,
  switchMap,
  tap,
} from 'rxjs';
import { MessagePageView, MessageView, PresenceView, ThreadView } from '../../models/chat';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { CHAT_API } from './chat-api';
import { MessageOutbox } from './message-outbox';
import { ThreadRow, mergeMessages, threadRows } from './thread-rows';
import { announcement } from './thread-text';
import { UnreadTracker } from './unread-tracker';

export type ThreadState = 'loading' | 'ready' | 'empty' | 'error';

/**
 * One open thread: its header, the messages loaded so far with those still on the device, and
 * what arrives live. Provided by the thread's page, so it lives and ends with it
 * (docs/detailed-designs/chat).
 */
@Injectable()
export class ThreadStore {
  private readonly chat = inject(CHAT_API);
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly outbox = inject(MessageOutbox);
  private readonly unread = inject(UnreadTracker);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly header = signal<ThreadView | null>(null);
  private readonly messages = signal<MessageView[]>([]);
  private readonly phase = signal<'loading' | 'ready' | 'error'>('loading');
  private readonly earlier = signal(false);
  private readonly below = signal(false);
  private readonly said = signal('');
  private readonly here = signal<PresenceView['members']>([]);
  private readonly today = signal(new Date());
  private readonly addedTo = new Subject<'mine' | 'theirs'>();

  private latestInView = true;
  private loadingEarlier?: Promise<void>;
  private reported: string | null = null;

  readonly thread = this.header.asReadonly();
  readonly hasEarlier = this.earlier.asReadonly();
  /** A message arrived under the part of the thread in view (L2-027 AC2). */
  readonly newMessagesBelow = this.below.asReadonly();
  /** The latest message from someone else, as assistive technology hears it (L2-027 AC6). */
  readonly announcement = this.said.asReadonly();
  /** The members who are here now, for the pane that names them. */
  readonly hereNow = this.here.asReadonly();
  /** A message was added at the end: the member's own, or someone else's. */
  readonly added$: Observable<'mine' | 'theirs'> = this.addedTo.asObservable();

  readonly rows = computed<ThreadRow[]>(() => {
    const thread = this.header();
    if (!thread) return [];
    return threadRows(
      this.messages(),
      this.outbox.entries().filter((entry) => entry.threadId === thread.id),
      thread.viewer.membershipId,
      this.today(),
    );
  });

  readonly state = computed<ThreadState>(() => {
    const phase = this.phase();
    if (phase !== 'ready') return phase;
    return this.rows().length === 0 ? 'empty' : 'ready';
  });

  constructor() {
    const mine = <T>(source: Observable<T>): Observable<T> =>
      source.pipe(takeUntilDestroyed(this.destroyRef));

    mine(this.realtime.messageAdded$).subscribe((message) => this.onAdded(message));
    mine(this.realtime.messageDeleted$).subscribe(({ threadId, messageId }) => {
      if (threadId !== this.header()?.id) return;
      this.messages.update((shown) => shown.filter((message) => message.id !== messageId));
    });
    mine(this.realtime.presenceChanged$).subscribe((presence) => {
      const thread = this.header();
      if (!thread || presence.popkinId !== thread.popkinId) return;
      if (presence.version <= thread.presenceVersion) return;
      this.header.set({ ...thread, hereNow: presence.hereNow, presenceVersion: presence.version });
      this.readPresence();
    });
    mine(this.realtime.memberJoined$).subscribe(({ popkinId }) => {
      const thread = this.header();
      if (thread?.popkinId !== popkinId) return;
      this.header.set({ ...thread, memberCount: thread.memberCount + 1 });
    });
    mine(this.realtime.reconnected$).subscribe(() => this.catchUp());
    mine(this.outbox.sent$).subscribe((message) => {
      if (message.threadId !== this.header()?.id) return;
      this.messages.update((shown) => mergeMessages(shown, [message]));
      this.reportRead();
    });
    mine(this.outbox.wrappedUp$).subscribe((popkinId) => {
      const thread = this.header();
      if (thread?.popkinId === popkinId) this.header.set({ ...thread, readOnly: true });
    });

    const visibility = (): void => this.reportRead();
    this.document.addEventListener('visibilitychange', visibility);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('visibilitychange', visibility);
      const thread = this.header();
      if (thread) this.unread.setReading(thread.id, false);
    });
  }

  /** Reads the Everyone thread of a Popkin and its latest messages, and starts listening. */
  open(popkinId: string): void {
    this.phase.set('loading');
    this.chat
      .getEveryone(popkinId)
      .pipe(
        switchMap((thread) =>
          this.chat.getMessages(popkinId, thread.id).pipe(map((page) => ({ thread, page }))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ thread, page }) => {
          this.today.set(new Date());
          this.header.set(thread);
          this.messages.set(page.items);
          this.earlier.set(page.hasMore);
          this.unread.set({
            popkinId: thread.popkinId,
            threadId: thread.id,
            viewerMembershipId: thread.viewer.membershipId,
            count: thread.unreadCount,
          });
          this.phase.set('ready');
          this.realtime.start();
          this.outbox.sendWaiting();
          this.readPresence();
          this.reportRead();
        },
        error: () => this.phase.set('error'),
      });
  }

  /** Loads the page before the oldest message shown (L2-027 AC5). */
  loadEarlier(): Promise<void> {
    const thread = this.header();
    const oldest = this.messages()[0];
    if (!thread || !oldest || !this.earlier()) return Promise.resolve();
    this.loadingEarlier ??= firstValueFrom(
      this.chat.getMessages(thread.popkinId, thread.id, { before: oldest.id }),
    )
      .then((page) => {
        this.messages.update((shown) => mergeMessages(shown, page.items));
        this.earlier.set(page.hasMore);
      })
      .catch(() => undefined)
      .finally(() => (this.loadingEarlier = undefined));
    return this.loadingEarlier;
  }

  /** The page says whether the latest message is in view; reading it moves the read point. */
  setLatestInView(inView: boolean): void {
    this.latestInView = inView;
    if (inView) this.below.set(false);
    this.reportRead();
  }

  send(text: string): void {
    const thread = this.header();
    const trimmed = text.trim();
    if (!thread || !trimmed || thread.readOnly) return;
    this.today.set(new Date());
    this.outbox.enqueue(thread.popkinId, thread.id, trimmed);
    this.addedTo.next('mine');
  }

  retry(clientMessageId: string): void {
    this.outbox.retry(clientMessageId);
  }

  discard(clientMessageId: string): void {
    this.outbox.discard(clientMessageId);
  }

  private onAdded(message: MessageView): void {
    const thread = this.header();
    if (!thread || message.threadId !== thread.id) return;
    if (this.messages().some((shown) => shown.id === message.id)) return;
    this.today.set(new Date());
    this.messages.update((shown) => mergeMessages(shown, [message]));
    if (message.author.membershipId === thread.viewer.membershipId) return;
    if (message.kind === 'Member') {
      this.said.set(announcement(message.author.firstName, message.text));
    }
    if (this.latestInView) this.addedTo.next('theirs');
    else this.below.set(true);
    this.reportRead();
  }

  /**
   * After a reconnect: reads what came after the newest message shown, page after page, then
   * reads the loaded window again and shows that instead, so a message deleted meanwhile goes.
   */
  private catchUp(): void {
    const thread = this.header();
    if (!thread) return;
    const before = this.messages().length;
    const newest = this.messages().at(-1);
    if (!newest) {
      this.open(thread.popkinId);
      return;
    }
    const after = (id: string): Observable<MessagePageView> =>
      this.chat.getMessages(thread.popkinId, thread.id, { after: id });

    after(newest.id)
      .pipe(
        expand((page) => {
          const lastItem = page.items.at(-1);
          return page.hasMore && lastItem ? after(lastItem.id) : EMPTY;
        }),
        tap((page) => this.messages.update((shown) => mergeMessages(shown, page.items))),
        last(),
        switchMap(() => {
          const shown = this.messages();
          return this.chat.getMessages(thread.popkinId, thread.id, {
            from: shown[0].id,
            to: shown[shown.length - 1].id,
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (window) => {
          this.today.set(new Date());
          this.messages.set(window.items);
          if (window.items.length > before && !this.latestInView) this.below.set(true);
          this.readPresence();
          this.reportRead();
        },
        error: () => undefined,
      });
  }

  private readPresence(): void {
    const popkinId = this.header()?.popkinId;
    if (!popkinId) return;
    this.chat
      .getPresence(popkinId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (presence) => {
          const thread = this.header();
          if (!thread || presence.version < thread.presenceVersion) return;
          this.header.set({
            ...thread,
            hereNow: presence.hereNow,
            presenceVersion: presence.version,
          });
          this.here.set(presence.members);
        },
        error: () => undefined,
      });
  }

  /** With the latest message in view on a visible page, the thread is read (L2-027 AC4). */
  private reportRead(): void {
    const thread = this.header();
    if (!thread) return;
    const reading = this.latestInView && this.document.visibilityState === 'visible';
    this.unread.setReading(thread.id, reading);
    if (!reading) return;
    this.unread.read(thread.id);
    const latest = this.messages().at(-1);
    if (!latest || latest.id === this.reported) return;
    this.reported = latest.id;
    this.chat
      .markRead(thread.popkinId, thread.id, latest.id)
      .subscribe({ error: () => (this.reported = null) });
  }
}
