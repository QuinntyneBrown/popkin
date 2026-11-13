import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { MessageView } from '../../models/chat';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { UnreadTracker } from './unread-tracker';

const message = (threadId: string, author: string): MessageView =>
  ({ id: crypto.randomUUID(), threadId, author: { membershipId: author } }) as MessageView;

describe('UnreadTracker (L2-027 AC3, AC4)', () => {
  const messageAdded$ = new Subject<MessageView>();
  const threadRead$ = new Subject<string>();
  let tracker: UnreadTracker;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: POPKIN_REALTIME, useValue: { messageAdded$, threadRead$ } }],
    });
    tracker = TestBed.inject(UnreadTracker);
    tracker.set({ popkinId: 'p', threadId: 't', viewerMembershipId: 'me', count: 2 });
  });

  it('starts from the count the API gave', () => {
    expect(tracker.forThread('t')).toBe(2);
    expect(tracker.forPopkin('p')).toBe(2);
  });

  it('counts a message from someone else in a thread the member is not looking at', () => {
    messageAdded$.next(message('t', 'walt'));
    expect(tracker.forThread('t')).toBe(3);
  });

  it('does not count the member’s own message', () => {
    messageAdded$.next(message('t', 'me'));
    expect(tracker.forThread('t')).toBe(2);
  });

  it('does not count a message that arrives with the latest in view', () => {
    tracker.setReading('t', true);
    messageAdded$.next(message('t', 'walt'));
    expect(tracker.forThread('t')).toBe(2);

    tracker.setReading('t', false);
    messageAdded$.next(message('t', 'walt'));
    expect(tracker.forThread('t')).toBe(3);
  });

  it('ignores a thread it was never told of', () => {
    messageAdded$.next(message('elsewhere', 'walt'));
    expect(tracker.forThread('elsewhere')).toBe(0);
    expect(tracker.forPopkin('p')).toBe(2);
  });

  it('counts a message of a thread it was not told of, in a Popkin it knows', () => {
    messageAdded$.next({ ...message('new', 'walt'), popkinId: 'p' });
    expect(tracker.forThread('new')).toBe(1);
    expect(tracker.forPopkin('p')).toBe(3);

    messageAdded$.next({ ...message('new', 'me'), popkinId: 'p' });
    expect(tracker.forThread('new')).toBe(1);
  });

  it('ignores a thread of a Popkin it does not know', () => {
    messageAdded$.next({ ...message('new', 'walt'), popkinId: 'q' });
    expect(tracker.forPopkin('q')).toBe(0);
  });

  it('takes a Popkin’s total, giving Everyone what its other threads do not account for', () => {
    tracker.set({ popkinId: 'p', threadId: 'd', viewerMembershipId: 'me', count: 1 });
    tracker.setPopkin({ popkinId: 'p', everyoneThreadId: 't', viewerMembershipId: 'me', count: 5 });
    expect(tracker.forThread('t')).toBe(4);
    expect(tracker.forPopkin('p')).toBe(5);

    tracker.setPopkin({ popkinId: 'p', everyoneThreadId: 't', viewerMembershipId: 'me', count: 0 });
    expect(tracker.forThread('t')).toBe(0);
  });

  it('is zero once the thread is read, here or on another device', () => {
    threadRead$.next('t');
    expect(tracker.forThread('t')).toBe(0);

    messageAdded$.next(message('t', 'walt'));
    tracker.read('t');
    expect(tracker.forThread('t')).toBe(0);
  });

  it('totals the threads of a Popkin', () => {
    tracker.set({ popkinId: 'p', threadId: 'u', viewerMembershipId: 'me', count: 5 });
    tracker.set({ popkinId: 'q', threadId: 'v', viewerMembershipId: 'me', count: 1 });
    expect(tracker.forPopkin('p')).toBe(7);
    expect(tracker.forPopkin('q')).toBe(1);
  });
});
