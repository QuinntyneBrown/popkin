import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Observable, Subject, map, of, switchMap, tap, timeout } from 'rxjs';
import { MessageView } from '../../models/chat';
import { toApiProblem } from '../problem';
import { CHAT_API } from './chat-api';
import { NETWORK_STATUS } from './network-status';
import type { ReplyQuote } from './thread-rows';

/** A message the server has not confirmed yet, as the device keeps it (L2-028). */
export interface OutboxEntry {
  /** The name the device gives the message before sending it; a retry reuses it. */
  clientMessageId: string;
  popkinId: string;
  threadId: string;
  text: string;
  state: 'Sending' | 'Waiting' | 'Failed';
  /** Why it failed: the answer never came, the API refused the message, or it asked to slow down. */
  failure?: 'network' | 'rejected' | 'rate_limited';
  /** ISO date-time the member wrote it. */
  createdAt: string;
  /** The message it replies to, as its quote shows it (L2-025). */
  replyTo?: ReplyQuote;
  /**
   * The photo it carries (L2-026): its id once uploaded, and while on the device the address
   * it shows from, which is never written down. The file itself is kept in memory only.
   */
  photo?: { id: string | null; preview?: string };
}

/** Where the outbox is kept on the device, so a reload loses nothing. */
export interface OutboxStorage {
  load(): OutboxEntry[];
  save(entries: OutboxEntry[]): void;
}

export const OUTBOX_STORAGE = new InjectionToken<OutboxStorage>('OutboxStorage');

/** How long a send may go unanswered before it is "Not sent". */
export const SEND_TIMEOUT_MS = 15_000;

/**
 * The messages a member has written that the server has not confirmed: an ordered queue per
 * thread, sent one at a time so they keep the order they were written in. A message that
 * cannot be sent stays, marked, until the member tries again or deletes it; one written
 * offline waits for the connection (L2-028 AC1, AC2).
 */
@Injectable({ providedIn: 'root' })
export class MessageOutbox {
  private readonly chat = inject(CHAT_API);
  private readonly network = inject(NETWORK_STATUS);
  private readonly storage = inject(OUTBOX_STORAGE);

  /** What a reload finds was never confirmed; it waits until the thread asks to send it. */
  private readonly held = signal<OutboxEntry[]>(
    this.storage.load().map((entry) => (entry.state === 'Sending' ? waiting(entry) : entry)),
  );
  private readonly inFlight = new Set<string>();
  /** The photos not yet uploaded, by the name of their message. */
  private readonly files = new Map<string, File>();
  private readonly sent = new Subject<MessageView>();
  private readonly limited = new Subject<number | undefined>();
  private readonly wrapped = new Subject<string>();

  readonly entries = this.held.asReadonly();
  /** Each message the server has stored. */
  readonly sent$: Observable<MessageView> = this.sent.asObservable();
  /** A send refused for sending too fast, with the seconds to wait when the API gave them. */
  readonly rateLimited$: Observable<number | undefined> = this.limited.asObservable();
  /** A Popkin that turned out to have wrapped up; what waited for it is dropped. */
  readonly wrappedUp$: Observable<string> = this.wrapped.asObservable();

  forThread(threadId: string): OutboxEntry[] {
    return this.held().filter((entry) => entry.threadId === threadId);
  }

  enqueue(
    popkinId: string,
    threadId: string,
    text: string,
    replyTo?: ReplyQuote,
    photo?: File,
  ): OutboxEntry {
    const entry: OutboxEntry = {
      clientMessageId: crypto.randomUUID(),
      popkinId,
      threadId,
      text,
      state: this.network.online() ? 'Sending' : 'Waiting',
      createdAt: new Date().toISOString(),
      ...(replyTo ? { replyTo } : {}),
      ...(photo ? { photo: { id: null, preview: URL.createObjectURL(photo) } } : {}),
    };
    if (photo) this.files.set(entry.clientMessageId, photo);
    this.update((entries) => [...entries, entry]);
    this.pump(threadId);
    return entry;
  }

  retry(clientMessageId: string): void {
    const entry = this.find(clientMessageId);
    if (!entry || entry.state !== 'Failed') return;
    this.change(clientMessageId, { state: 'Sending', failure: undefined });
    this.pump(entry.threadId);
  }

  discard(clientMessageId: string): void {
    const entry = this.find(clientMessageId);
    if (!entry) return;
    this.update((entries) => entries.filter((kept) => kept !== entry));
    this.forget(entry);
    // The server may hold it with its answer lost; asking is safe whatever it holds.
    if (entry.failure === 'network') {
      this.chat
        .discard(entry.popkinId, entry.threadId, clientMessageId)
        .subscribe({ error: () => undefined });
    }
    this.pump(entry.threadId);
  }

  /** Sends everything that waited for a connection, each thread in order; answers how many. */
  sendWaiting(): number {
    const waitingNow = this.held().filter((entry) => entry.state === 'Waiting');
    if (waitingNow.length === 0 || !this.network.online()) return 0;
    this.update((entries) =>
      entries.map((entry) => (entry.state === 'Waiting' ? { ...entry, state: 'Sending' } : entry)),
    );
    for (const threadId of new Set(waitingNow.map((entry) => entry.threadId))) this.pump(threadId);
    return waitingNow.length;
  }

  /** Sends the thread's oldest message, unless one is on its way or a failure holds the queue. */
  private pump(threadId: string): void {
    if (this.inFlight.has(threadId)) return;
    const next = this.forThread(threadId).find((entry) => entry.failure !== 'rejected');
    if (!next || next.state !== 'Sending') return;

    // A photo whose file a reload lost cannot be sent; it stays to be deleted.
    const file = this.files.get(next.clientMessageId);
    if (next.photo && !next.photo.id && !file) {
      this.change(next.clientMessageId, { state: 'Failed', failure: 'rejected' });
      this.pump(threadId);
      return;
    }

    this.inFlight.add(threadId);
    this.photoIdOf(next, file)
      .pipe(
        switchMap((photoId) =>
          this.chat
            .send(
              next.popkinId,
              threadId,
              next.clientMessageId,
              next.text,
              next.replyTo?.messageId,
              photoId,
            )
            .pipe(timeout(SEND_TIMEOUT_MS)),
        ),
      )
      .subscribe({
        next: (message) => {
          this.inFlight.delete(threadId);
          this.update((entries) =>
            entries.filter((entry) => entry.clientMessageId !== next.clientMessageId),
          );
          this.forget(next);
          this.sent.next(message);
          this.pump(threadId);
        },
        error: (error: unknown) => {
          this.inFlight.delete(threadId);
          this.failed(next, error);
        },
      });
  }

  /** The photo's id: uploaded now, unless an earlier try already did; none for text alone. */
  private photoIdOf(entry: OutboxEntry, file: File | undefined): Observable<string | undefined> {
    if (!entry.photo) return of(undefined);
    if (entry.photo.id) return of(entry.photo.id);
    if (!file) return of(undefined);
    return this.chat.uploadPhoto(entry.popkinId, entry.threadId, file).pipe(
      timeout(SEND_TIMEOUT_MS),
      tap((photo) =>
        this.change(entry.clientMessageId, {
          photo: { id: photo.id, preview: entry.photo?.preview },
        }),
      ),
      map((photo) => photo.id),
    );
  }

  /** A message that is sent or deleted needs its photo no more. */
  private forget(entry: OutboxEntry): void {
    this.files.delete(entry.clientMessageId);
    if (entry.photo?.preview) URL.revokeObjectURL(entry.photo.preview);
  }

  private failed(entry: OutboxEntry, error: unknown): void {
    const problem = toApiProblem(error);
    if (problem.status === 409 && problem.code === 'popkin_wrapped_up') {
      this.update((entries) => entries.filter((kept) => kept.popkinId !== entry.popkinId));
      this.wrapped.next(entry.popkinId);
      return;
    }
    if (problem.status === 429) {
      this.change(entry.clientMessageId, { state: 'Failed', failure: 'rate_limited' });
      this.limited.next(problem.retryAfterSeconds);
      return;
    }
    if (problem.status >= 400 && problem.status < 500) {
      this.change(entry.clientMessageId, { state: 'Failed', failure: 'rejected' });
      this.pump(entry.threadId);
      return;
    }
    this.change(entry.clientMessageId, { state: 'Failed', failure: 'network' });
  }

  private find(clientMessageId: string): OutboxEntry | undefined {
    return this.held().find((entry) => entry.clientMessageId === clientMessageId);
  }

  private change(clientMessageId: string, change: Partial<OutboxEntry>): void {
    this.update((entries) =>
      entries.map((entry) =>
        entry.clientMessageId === clientMessageId ? { ...entry, ...change } : entry,
      ),
    );
  }

  private update(change: (entries: OutboxEntry[]) => OutboxEntry[]): void {
    this.held.update(change);
    // An address made on this device means nothing after a reload.
    this.storage.save(
      this.held().map((entry) =>
        entry.photo ? { ...entry, photo: { id: entry.photo.id } } : entry,
      ),
    );
  }
}

function waiting(entry: OutboxEntry): OutboxEntry {
  return { ...entry, state: 'Waiting', failure: undefined };
}
