import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalOutboxStorage } from './local-outbox-storage';
import { OutboxEntry } from './message-outbox';

const waiting: OutboxEntry = {
  clientMessageId: 'c1',
  popkinId: 'p1',
  threadId: 't1',
  text: 'On my way',
  state: 'Waiting',
  createdAt: '2026-11-17T09:00:00Z',
};

describe('LocalOutboxStorage (L2-028 AC2)', () => {
  function storage(doc: Document = document): LocalOutboxStorage {
    TestBed.configureTestingModule({
      providers: [LocalOutboxStorage, { provide: DOCUMENT, useValue: doc }],
    });
    return TestBed.inject(LocalOutboxStorage);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('keeps waiting messages under popkin.outbox as a JSON list, so a reload finds them', () => {
    storage().save([waiting]);

    expect(localStorage.getItem('popkin.outbox')).toBe(JSON.stringify([waiting]));
    TestBed.resetTestingModule();
    expect(storage().load()).toEqual([waiting]);
  });

  it('removes popkin.outbox once nothing waits', () => {
    const outbox = storage();
    outbox.save([waiting]);

    outbox.save([]);

    expect(localStorage.getItem('popkin.outbox')).toBeNull();
  });

  it.each([
    ['nothing saved', null],
    ['a value it cannot parse', 'not json'],
    ['a value that is not a list', '{"clientMessageId":"c1"}'],
  ])('loads an empty outbox from %s', (_, saved) => {
    if (saved !== null) localStorage.setItem('popkin.outbox', saved);
    expect(storage().load()).toEqual([]);
  });

  it('keeps the outbox in memory only when the store refuses access', () => {
    const blocked = {
      defaultView: {
        get localStorage(): Storage {
          throw new DOMException('Blocked', 'SecurityError');
        },
      },
    } as unknown as Document;
    const outbox = storage(blocked);

    expect(outbox.load()).toEqual([]);
    expect(() => outbox.save([waiting])).not.toThrow();
  });
});
