import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { CallView } from '../../models/calls';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { CallBannerStore } from './call-banner-store';
import { CallSession } from './call-session';
import { CALLS_API } from './calls-api';

const call = (participantCount: number, version = 1): CallView => ({
  id: 'call-1',
  startedAt: new Date(2026, 8, 12, 12, 0).toISOString(),
  version,
  participantCount,
  threadId: null,
});

describe('CallBannerStore', () => {
  let current: CallView | null | 'down';
  let asked: number;
  let changed: Subject<{
    popkinId: string;
    callId: string;
    version: number;
    participantCount: number;
    threadId: string | null;
  }>;
  let ended: Subject<{ popkinId: string; callId: string; threadId: string | null }>;
  let askedFor: (string | undefined)[];
  let reconnected: Subject<void>;
  let onCall: ReturnType<typeof signal<string | null>>;
  let store: CallBannerStore;

  beforeEach(() => {
    current = call(6, 4);
    asked = 0;
    askedFor = [];
    changed = new Subject();
    ended = new Subject();
    reconnected = new Subject();
    onCall = signal<string | null>(null);
    TestBed.configureTestingModule({
      providers: [
        CallBannerStore,
        {
          provide: CALLS_API,
          useValue: {
            getCurrent: (_: string, threadId?: string): Observable<CallView | null> => {
              asked++;
              askedFor.push(threadId);
              return current === 'down'
                ? throwError(() => new HttpErrorResponse({ status: 500 }))
                : of(current);
            },
          },
        },
        {
          provide: POPKIN_REALTIME,
          useValue: { callChanged$: changed, callEnded$: ended, reconnected$: reconnected },
        },
        { provide: CallSession, useValue: { callId: onCall } },
      ],
    });
    store = TestBed.inject(CallBannerStore);
  });

  it('shows nothing before it has read', () => {
    expect(store.banner()).toBeNull();
  });

  it('says how many are on the call under way and offers to join', () => {
    store.open('lakeside');
    expect(store.banner()).toEqual({ callId: 'call-1', text: '6 on the call', action: 'Join' });
  });

  it('shows nothing when no call is under way, or when it could not be read', () => {
    current = null;
    store.open('lakeside');
    expect(store.banner()).toBeNull();
    current = 'down';
    store.open('lakeside');
    expect(store.banner()).toBeNull();
  });

  it('appears when someone starts a call', () => {
    current = null;
    store.open('lakeside');
    changed.next({
      popkinId: 'lakeside',
      callId: 'call-2',
      version: 1,
      participantCount: 1,
      threadId: null,
    });
    expect(store.banner()).toEqual({ callId: 'call-2', text: '1 on the call', action: 'Join' });
  });

  it('follows the count as people join and leave', () => {
    store.open('lakeside');
    changed.next({
      popkinId: 'lakeside',
      callId: 'call-1',
      version: 5,
      participantCount: 7,
      threadId: null,
    });
    expect(store.banner()?.text).toBe('7 on the call');
  });

  it('drops a change older than the one it holds', () => {
    store.open('lakeside');
    changed.next({
      popkinId: 'lakeside',
      callId: 'call-1',
      version: 3,
      participantCount: 2,
      threadId: null,
    });
    changed.next({
      popkinId: 'lakeside',
      callId: 'call-1',
      version: 4,
      participantCount: 2,
      threadId: null,
    });
    expect(store.banner()?.text).toBe('6 on the call');
  });

  it('ignores another Popkin’s call', () => {
    store.open('lakeside');
    changed.next({
      popkinId: 'thursday',
      callId: 'call-9',
      version: 9,
      participantCount: 2,
      threadId: null,
    });
    ended.next({ popkinId: 'thursday', callId: 'call-9', threadId: null });
    expect(store.banner()?.text).toBe('6 on the call');
  });

  it('goes when the last person leaves', () => {
    store.open('lakeside');
    ended.next({ popkinId: 'lakeside', callId: 'call-1', threadId: null });
    expect(store.banner()).toBeNull();
  });

  it('does not come back for a late change of a call that ended', () => {
    store.open('lakeside');
    ended.next({ popkinId: 'lakeside', callId: 'call-1', threadId: null });
    changed.next({
      popkinId: 'lakeside',
      callId: 'call-1',
      version: 9,
      participantCount: 1,
      threadId: null,
    });
    expect(store.banner()).toBeNull();
  });

  it('offers to return when the member is on the call', () => {
    store.open('lakeside');
    onCall.set('call-1');
    expect(store.banner()?.action).toBe('Return');
  });

  it('reads again when the connection returns', () => {
    store.open('lakeside');
    current = null;
    reconnected.next();
    expect(asked).toBe(2);
    expect(store.banner()).toBeNull();
  });

  describe('of a direct message (L2-030 AC8)', () => {
    const inThread = { ...call(1, 2), id: 'call-d', threadId: 't-walt' };

    it('reads the call of that thread', () => {
      current = inThread;
      store.open('lakeside', 't-walt');
      expect(askedFor).toEqual(['t-walt']);
      expect(store.banner()).toEqual({ callId: 'call-d', text: '1 on the call', action: 'Join' });
    });

    it('follows that thread’s call, and not the group call or another thread’s', () => {
      current = null;
      store.open('lakeside', 't-walt');
      const change = { popkinId: 'lakeside', version: 1, participantCount: 1 };
      changed.next({ ...change, callId: 'call-g', threadId: null });
      changed.next({ ...change, callId: 'call-e', threadId: 't-ellie' });
      expect(store.banner()).toBeNull();

      changed.next({ ...change, callId: 'call-d', threadId: 't-walt' });
      expect(store.banner()?.callId).toBe('call-d');
      ended.next({ popkinId: 'lakeside', callId: 'call-d', threadId: 't-walt' });
      expect(store.banner()).toBeNull();
    });

    it('is not shown as the group call', () => {
      current = null;
      store.open('lakeside');
      changed.next({
        popkinId: 'lakeside',
        callId: 'call-d',
        version: 1,
        participantCount: 1,
        threadId: 't-walt',
      });
      expect(store.banner()).toBeNull();
    });
  });
});
