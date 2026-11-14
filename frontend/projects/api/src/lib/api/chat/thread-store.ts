import { WrapUpWatch } from '../wrap-up/wrap-up-watch';
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
import {
  MessagePageView,
  MessageView,
  PresenceView,
  ReactionSummary,
  ThreadView,
} from '../../models/chat';
import { toApiProblem } from '../problem';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { CHAT_API } from './chat-api';
import { albumPhotoProblem } from '../photos/photo-rules';
import { MessageOutbox } from './message-outbox';
import { ReplyQuote, ThreadRow, mergeMessages, threadRows } from './thread-rows';
import { announcement, messageLine } from './thread-text';
import { UnreadTracker } from './unread-tracker';

/** How long a message a quote led to stays marked. */
export const MARKED_MS = 2_000;

/** Something the member did that did not save; `retry` does it again (L2-056 AC7). */
export interface ThreadFailure {
  kind: 'reaction' | 'delete';
  retry: () => void;
}

/** `not-found` is a Popkin the person is not a member of, or one that does not exist. */
export type ThreadState = 'loading' | 'ready' | 'empty' | 'error' | 'not-found';

/**
 * One open thread: its header, the messages loaded so far with those still on the device, and
 * what arrives live. Provided by the thread's page, so it lives and ends with it
 * (docs/detailed-designs/chat).
 */
@Injectable()
export class ThreadStore {
  private readonly chat = inject(CHAT_API);
  private readonly watch = inject(WrapUpWatch);
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly outbox = inject(MessageOutbox);
  private readonly unread = inject(UnreadTracker);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly header = signal<ThreadView | null>(null);
  private readonly messages = signal<MessageView[]>([]);
  private readonly phase = signal<'loading' | 'ready' | 'error' | 'not-found'>('loading');
  private readonly earlier = signal(false);
  private readonly below = signal(false);
  private readonly said = signal('');
  private readonly here = signal<PresenceView['members']>([]);
  private readonly today = signal(new Date());
  private readonly addedTo = new Subject<'mine' | 'theirs'>();
  private readonly failed = new Subject<ThreadFailure>();
  private readonly reply = signal<ReplyQuote | null>(null);
  private readonly chosen = signal<{ file: File; preview: string } | null>(null);
  private readonly refused = signal<string | null>(null);
  private readonly mark = signal<string | null>(null);
  private unmark?: ReturnType<typeof setTimeout>;

  /** The other member of the direct message that is open; none for Everyone. */
  private memberId?: string;
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
  /** The message a quote led to, marked for a moment (L2-025 AC3). */
  readonly marked = this.mark.asReadonly();
  /** The message the member is replying to, for the bar above the field (L2-025 AC1). */
  readonly replyingTo = this.reply.asReadonly();
  /** The photo chosen for the next message, and the address its preview shows from. */
  readonly photo = this.chosen.asReadonly();
  /** Why the photo chosen was refused; null when nothing was (L2-026 AC4). */
  readonly photoProblem = this.refused.asReadonly();
  /** A reaction or a deletion that did not save, after what it changed is put back. */
  readonly failures$: Observable<ThreadFailure> = this.failed.asObservable();

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
      if (threadId === this.header()?.id) this.removeMessage(messageId);
    });
    mine(this.realtime.photoDeleted$).subscribe(({ popkinId, photoId }) => {
      if (popkinId === this.header()?.popkinId) this.photoRemoved(photoId);
    });
    mine(this.realtime.reactionsChanged$).subscribe(
      ({ threadId, messageId, version, reactions }) => {
        if (threadId === this.header()?.id) this.setReactions(messageId, reactions, version);
      },
    );
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
    mine(this.realtime.memberLeft$).subscribe(({ popkinId }) => {
      const thread = this.header();
      if (thread?.popkinId !== popkinId) return;
      this.header.set({ ...thread, memberCount: Math.max(1, thread.memberCount - 1) });
    });
    // L2-020 AC3, AC4: the Host changed the Popkin's look or its end.
    mine(this.realtime.popkinChanged$).subscribe((change) => {
      const thread = this.header();
      if (thread?.popkinId !== change.id || change.version <= thread.popkinVersion) return;
      this.header.set({
        ...thread,
        popkinName: change.name,
        emoji: change.emoji,
        colour: change.colour,
        endsAt: change.endsAt,
        popkinVersion: change.version,
      });
      if (!thread.readOnly) this.watch.look(thread.popkinId, change.endsAt);
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
      clearTimeout(this.unmark);
      this.removePhoto();
      this.document.removeEventListener('visibilitychange', visibility);
      const thread = this.header();
      if (thread) this.unread.setReading(thread.id, false);
    });
  }

  /**
   * Reads a thread of a Popkin and its latest messages, and starts listening: the Everyone
   * thread, or the direct message with a member when one is named (L2-023). A thread opened
   * where it cannot be seen yet, such as a pane hidden on a phone, says `inView: false`: it is
   * not read until its latest message is on screen.
   */
  open(popkinId: string, memberId?: string, options: { inView?: boolean } = {}): void {
    this.memberId = memberId;
    if (options.inView !== undefined) this.latestInView = options.inView;
    this.phase.set('loading');
    (memberId ? this.chat.openDirect(popkinId, memberId) : this.chat.getEveryone(popkinId))
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
          if (thread.readOnly) this.watch.look(null, null);
          else this.watch.look(thread.popkinId, thread.endsAt);
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
        error: (error: unknown) => {
          const problem = toApiProblem(error);
          // A direct message with oneself is no thread at all (L2-023).
          const gone = problem.status === 404 || problem.code === 'cannot_message_self';
          this.phase.set(gone ? 'not-found' : 'error');
        },
      });
  }

  /**
   * Loads the page before the oldest message shown (L2-027 AC5). The rows are added inside
   * `within`, so the page can hold the view still around the change.
   */
  loadEarlier(within: (change: () => void) => void = (change) => change()): Promise<void> {
    const thread = this.header();
    const oldest = this.messages()[0];
    if (!thread || !oldest || !this.earlier()) return Promise.resolve();
    this.loadingEarlier ??= firstValueFrom(
      this.chat.getMessages(thread.popkinId, thread.id, { before: oldest.id }),
    )
      .then((page) =>
        within(() => {
          this.messages.update((shown) => mergeMessages(shown, page.items));
          this.earlier.set(page.hasMore);
        }),
      )
      .catch(() => undefined)
      .finally(() => (this.loadingEarlier = undefined));
    return this.loadingEarlier;
  }

  /**
   * Finds a quoted message, loading earlier pages until the thread shows it, and marks it for
   * two seconds (L2-025 AC3). Answers whether it was found, so the page can scroll to it.
   */
  async jumpTo(messageId: string): Promise<boolean> {
    const has = () => this.messages().some((message) => message.id === messageId);
    while (!has() && this.earlier()) {
      const count = this.messages().length;
      await this.loadEarlier();
      if (this.messages().length === count) break;
    }
    if (!has()) return false;
    clearTimeout(this.unmark);
    this.mark.set(messageId);
    this.unmark = setTimeout(() => this.mark.set(null), MARKED_MS);
    return true;
  }

  /** The page says whether the latest message is in view; reading it moves the read point. */
  setLatestInView(inView: boolean): void {
    this.latestInView = inView;
    if (inView) this.below.set(false);
    this.reportRead();
  }

  /** Sends the text, the photo chosen, or both (L2-021 AC5, L2-026 AC1). */
  send(text: string): void {
    const thread = this.header();
    const trimmed = text.trim();
    const photo = this.chosen();
    if (!thread || thread.readOnly || (!trimmed && !photo)) return;
    this.today.set(new Date());
    this.outbox.enqueue(
      thread.popkinId,
      thread.id,
      trimmed,
      this.reply() ?? undefined,
      photo?.file,
    );
    this.reply.set(null);
    this.removePhoto();
    this.addedTo.next('mine');
  }

  /**
   * The photo the member picked for the next message: shown above the field, or, when it is not
   * one Popkin takes, refused with the reason (L2-026 AC1, AC4; L2-031 AC2).
   */
  choosePhoto(file: File): void {
    if (this.header()?.readOnly) return;
    const problem = albumPhotoProblem(file);
    this.removePhoto();
    this.refused.set(problem);
    if (!problem) this.chosen.set({ file, preview: URL.createObjectURL(file) });
  }

  removePhoto(): void {
    const photo = this.chosen();
    if (photo) URL.revokeObjectURL(photo.preview);
    this.chosen.set(null);
  }

  dismissPhotoProblem(): void {
    this.refused.set(null);
  }

  /** The next message sent replies to this one, with its first name and one line (L2-025). */
  startReply(messageId: string): void {
    const thread = this.header();
    const message = this.messages().find((shown) => shown.id === messageId);
    if (!thread || thread.readOnly || !message || message.kind !== 'Member') return;
    this.reply.set({
      messageId,
      firstName: message.author.firstName,
      snippet: firstLine(messageLine(message)),
      deleted: false,
    });
  }

  cancelReply(): void {
    this.reply.set(null);
  }

  /**
   * Adds the member's reaction with this emoji, or takes it away if they already chose it
   * (L2-024 AC2 to AC4). The chips change at once; what the server answers replaces them, and a
   * failure puts back what was there.
   */
  toggleReaction(messageId: string, emoji: string): void {
    const thread = this.header();
    const message = this.messages().find((shown) => shown.id === messageId);
    if (!thread || !message || thread.readOnly) return;
    const me = thread.viewer.membershipId;
    const before = message.reactions;
    const adding = !before.some((r) => r.emoji === emoji && r.membershipIds.includes(me));
    this.showReactions(messageId, toggled(before, emoji, me, adding));
    (adding ? this.chat.react : this.chat.unreact)
      .call(this.chat, thread.popkinId, thread.id, messageId, emoji)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ version, reactions }) => this.setReactions(messageId, reactions, version),
        error: () => {
          // Put back what was there, unless the server has told of a newer change meanwhile.
          const now = this.messages().find((shown) => shown.id === messageId);
          if (now?.reactionsVersion === message.reactionsVersion) {
            this.showReactions(messageId, before);
          }
          this.failed.next({
            kind: 'reaction',
            retry: () => this.toggleReaction(messageId, emoji),
          });
        },
      });
  }

  /**
   * A photo was deleted: the messages that carried it read "Photo removed", and so do the quotes
   * of those with no text, as the next read of the thread gives (L2-036 AC3).
   */
  private photoRemoved(photoId: string): void {
    const carried = new Set(
      this.messages()
        .filter((message) => message.photo?.id === photoId)
        .map((message) => message.id),
    );
    if (carried.size === 0) return;
    this.messages.update((shown) =>
      shown.map((message) => {
        if (carried.has(message.id)) return { ...message, photo: null, photoRemoved: true };
        const quote = message.quote;
        if (quote && carried.has(quote.messageId) && quote.snippet === 'Photo') {
          return { ...message, quote: { ...quote, snippet: 'Photo removed' } };
        }
        return message;
      }),
    );
  }

  /**
   * Deletes the member's own message for everyone; it goes once the server has deleted it, and
   * the replies to it read "Message deleted" (L2-025 AC4).
   */
  deleteMessage(messageId: string): void {
    const thread = this.header();
    const message = this.messages().find((shown) => shown.id === messageId);
    if (!thread || thread.readOnly || message?.author.membershipId !== thread.viewer.membershipId) {
      return;
    }
    this.chat
      .deleteMessage(thread.popkinId, thread.id, messageId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.removeMessage(messageId),
        error: () =>
          this.failed.next({ kind: 'delete', retry: () => this.deleteMessage(messageId) }),
      });
  }

  retry(clientMessageId: string): void {
    this.outbox.retry(clientMessageId);
  }

  discard(clientMessageId: string): void {
    this.outbox.discard(clientMessageId);
  }

  private removeMessage(messageId: string): void {
    this.messages.update((shown) =>
      shown
        .filter((message) => message.id !== messageId)
        .map((message) =>
          message.quote?.messageId === messageId
            ? {
                ...message,
                quote: { messageId, authorFirstName: null, snippet: null, deleted: true },
              }
            : message,
        ),
    );
    if (this.reply()?.messageId === messageId) this.reply.set(null);
  }

  /** The server's reactions of a message, unless those shown are of a later change. */
  private setReactions(messageId: string, reactions: ReactionSummary[], version: number): void {
    this.messages.update((shown) =>
      shown.map((message) =>
        message.id === messageId && version > message.reactionsVersion
          ? { ...message, reactions, reactionsVersion: version }
          : message,
      ),
    );
  }

  /** The member's own change, shown before the server answers. */
  private showReactions(messageId: string, reactions: ReactionSummary[]): void {
    this.messages.update((shown) =>
      shown.map((message) => (message.id === messageId ? { ...message, reactions } : message)),
    );
  }

  private onAdded(message: MessageView): void {
    const thread = this.header();
    if (!thread || message.threadId !== thread.id) return;
    if (this.messages().some((shown) => shown.id === message.id)) return;
    this.today.set(new Date());
    this.messages.update((shown) => mergeMessages(shown, [message]));
    if (message.author.membershipId === thread.viewer.membershipId) return;
    if (message.kind === 'Member') {
      this.said.set(announcement(message.author.firstName, messageLine(message)));
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
      this.open(thread.popkinId, this.memberId);
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
          const to = shown[shown.length - 1];
          return this.chat
            .getMessages(thread.popkinId, thread.id, { from: shown[0].id, to: to.id })
            .pipe(map((window) => ({ window, to })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ window, to }) => {
          this.today.set(new Date());
          // What arrived or was sent while the window was being read is newer than it: keep it.
          const since = this.messages().filter(
            (message) => mergeMessages([to], [message]).at(-1) === message && message.id !== to.id,
          );
          this.messages.set(mergeMessages(window.items, since));
          if (this.messages().length > before && !this.latestInView) this.below.set(true);
          this.readPresence();
          this.reportRead();
        },
        error: () => undefined,
      });
  }

  private readPresence(): void {
    // Who is here is said of the Popkin, in the Everyone thread; a direct message has two.
    if (this.header()?.kind !== 'Everyone') return;
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

/** The reactions with the member added to, or taken from, one emoji; a chip at zero goes. */
function toggled(
  reactions: readonly ReactionSummary[],
  emoji: string,
  me: string,
  adding: boolean,
): ReactionSummary[] {
  const found = reactions.some((r) => r.emoji === emoji);
  const changed = reactions.map((r) =>
    r.emoji !== emoji
      ? r
      : {
          emoji,
          membershipIds: adding
            ? [...r.membershipIds, me]
            : r.membershipIds.filter((id) => id !== me),
        },
  );
  if (adding && !found) changed.push({ emoji, membershipIds: [me] });
  return changed.filter((r) => r.membershipIds.length > 0);
}

/** The first line of a message, at most 120 characters, as the server quotes it. */
function firstLine(text: string): string {
  return (text.split('\n')[0] ?? '').slice(0, 120);
}
