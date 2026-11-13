import { Injectable, inject, signal } from '@angular/core';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';

interface Tracked {
  popkinId: string;
  viewerMembershipId: string;
  count: number;
  /** The member has the thread open with its latest message in view. */
  reading: boolean;
}

/**
 * Unread messages per thread and per Popkin (L2-027 AC3, AC4). It starts from the counts the
 * API gives, adds a message from someone else that arrives while the member is not looking at
 * its thread, and is zero once the thread is read, here or on another device.
 */
@Injectable({ providedIn: 'root' })
export class UnreadTracker {
  private readonly threads = signal<ReadonlyMap<string, Tracked>>(new Map());

  constructor() {
    const realtime = inject(POPKIN_REALTIME);
    realtime.messageAdded$.subscribe((message) => {
      const thread = this.threads().get(message.threadId) ?? this.begun(message);
      if (!thread || thread.reading) return;
      if (message.author.membershipId === thread.viewerMembershipId) return;
      this.put(message.threadId, { ...thread, count: thread.count + 1 });
    });
    realtime.threadRead$.subscribe((threadId) => this.read(threadId));
  }

  /** Takes the count the API answered for a thread. */
  set(thread: {
    popkinId: string;
    threadId: string;
    viewerMembershipId: string;
    count: number;
  }): void {
    const reading = this.threads().get(thread.threadId)?.reading ?? false;
    this.put(thread.threadId, {
      popkinId: thread.popkinId,
      viewerMembershipId: thread.viewerMembershipId,
      count: thread.count,
      reading,
    });
  }

  /**
   * Takes the count the API answered for a whole Popkin, its direct messages included: what
   * the threads already known do not account for is the Everyone thread's.
   */
  setPopkin(popkin: {
    popkinId: string;
    everyoneThreadId: string;
    viewerMembershipId: string;
    count: number;
  }): void {
    let others = 0;
    for (const [threadId, thread] of this.threads()) {
      if (thread.popkinId === popkin.popkinId && threadId !== popkin.everyoneThreadId) {
        others += thread.count;
      }
    }
    this.set({
      popkinId: popkin.popkinId,
      threadId: popkin.everyoneThreadId,
      viewerMembershipId: popkin.viewerMembershipId,
      count: Math.max(0, popkin.count - others),
    });
  }

  setReading(threadId: string, reading: boolean): void {
    this.change(threadId, { reading });
  }

  read(threadId: string): void {
    this.change(threadId, { count: 0 });
  }

  forThread(threadId: string): number {
    return this.threads().get(threadId)?.count ?? 0;
  }

  forPopkin(popkinId: string): number {
    let total = 0;
    for (const thread of this.threads().values()) {
      if (thread.popkinId === popkinId) total += thread.count;
    }
    return total;
  }

  /**
   * A thread nobody told the tracker of, in a Popkin it knows: a direct message someone has
   * just begun with the member.
   */
  private begun(message: { popkinId: string }): Tracked | undefined {
    for (const thread of this.threads().values()) {
      if (thread.popkinId === message.popkinId) return { ...thread, count: 0, reading: false };
    }
    return undefined;
  }

  private change(threadId: string, change: Partial<Tracked>): void {
    const thread = this.threads().get(threadId);
    if (thread) this.put(threadId, { ...thread, ...change });
  }

  private put(threadId: string, thread: Tracked): void {
    this.threads.update((threads) => new Map(threads).set(threadId, thread));
  }
}
