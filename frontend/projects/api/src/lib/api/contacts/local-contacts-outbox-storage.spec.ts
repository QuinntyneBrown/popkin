import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ContactsOutboxEntry } from './contacts-outbox';
import { LocalContactsOutboxStorage } from './local-contacts-outbox-storage';

const waiting: ContactsOutboxEntry = {
  clientId: 'w1',
  kind: 'add-contact',
  request: {
    clientId: 'w1',
    name: 'Ada Lovelace',
    knownAs: 'Ada',
    circle: null,
    phone: '',
    email: 'ada@example.com',
    city: 'London',
    howWeMet: '',
    loves: [],
  },
  state: 'Waiting',
};

describe('LocalContactsOutboxStorage (L2-123 AC4)', () => {
  function storage(doc: Document = document): LocalContactsOutboxStorage {
    TestBed.configureTestingModule({
      providers: [LocalContactsOutboxStorage, { provide: DOCUMENT, useValue: doc }],
    });
    return TestBed.inject(LocalContactsOutboxStorage);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('keeps waiting writes under popkin.contacts-outbox as a JSON list, so a reload finds them', () => {
    storage().save([waiting]);

    expect(localStorage.getItem('popkin.contacts-outbox')).toBe(JSON.stringify([waiting]));
    TestBed.resetTestingModule();
    expect(storage().load()).toEqual([waiting]);
  });

  it('removes popkin.contacts-outbox once nothing waits', () => {
    const outbox = storage();
    outbox.save([waiting]);

    outbox.save([]);

    expect(localStorage.getItem('popkin.contacts-outbox')).toBeNull();
  });

  it.each([
    ['nothing saved', null],
    ['a value it cannot parse', 'not json'],
    ['a value that is not a list', '{"clientId":"w1"}'],
  ])('loads an empty outbox from %s', (_, saved) => {
    if (saved !== null) localStorage.setItem('popkin.contacts-outbox', saved);
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
