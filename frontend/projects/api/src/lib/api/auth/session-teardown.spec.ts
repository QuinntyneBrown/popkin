import { ViewportScroller } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POPKINS_SNAPSHOT } from '../popkins/popkins-snapshot';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { SessionStore } from './session.store';
import { SessionTeardown } from './session-teardown';

describe('SessionTeardown (L2-054)', () => {
  let teardown: SessionTeardown;
  let done: string[];
  const navigateByUrl = vi.fn((url: string) => {
    done.push(`open ${url}`);
    return Promise.resolve(true);
  });

  beforeEach(() => {
    done = [];
    navigateByUrl.mockClear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: POPKIN_REALTIME,
          useValue: { stop: () => done.push('stop the live connection') },
        },
        { provide: SessionStore, useValue: { clear: () => done.push('forget the session') } },
        { provide: POPKINS_SNAPSHOT, useValue: { clear: () => done.push('forget My Popkins') } },
        { provide: Router, useValue: { navigateByUrl } },
        {
          provide: ViewportScroller,
          useValue: { scrollToPosition: (at: number[]) => done.push(`scroll to ${at}`) },
        },
      ],
    });
    teardown = TestBed.inject(SessionTeardown);
  });

  it('closes the live connection and forgets the person on this device (CQ-06)', () => {
    teardown.forget();

    expect(done).toEqual(['stop the live connection', 'forget the session', 'forget My Popkins']);
  });

  it('then opens a screen at its top', async () => {
    await teardown.end('/welcome');

    expect(done).toEqual([
      'stop the live connection',
      'forget the session',
      'forget My Popkins',
      'open /welcome',
      'scroll to 0,0',
    ]);
  });
});
