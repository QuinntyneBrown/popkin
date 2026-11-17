import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionsView } from '../../models/connections';
import { SessionStore } from '../auth/session.store';
import { CONTACTS_API } from './contacts-api';
import { ConnectionsStore } from './connections-store';

const map: ConnectionsView = {
  people: [
    {
      contactId: 'c',
      firstName: 'Chidi',
      fullName: 'Chidi Okafor',
      initials: 'CO',
      accent: 'Sky',
      photoUrl: null,
      knownAs: 'Brother',
      circle: 'Family',
    },
    {
      contactId: 't',
      firstName: 'Tomás',
      fullName: 'Tomás Reyes',
      initials: 'TR',
      accent: 'Leaf',
      photoUrl: null,
      knownAs: null,
      circle: null,
    },
  ],
  connections: [
    {
      id: '1',
      contactId: 'c',
      otherContactId: 't',
      kind: 'Partner',
      words: 'Married',
      promised: false,
    },
  ],
};

describe('ConnectionsStore (L2-149)', () => {
  let store: ConnectionsStore;
  const api = { connectionMap: vi.fn() };

  beforeEach(() => {
    api.connectionMap.mockReturnValue(of(map));
    TestBed.configureTestingModule({
      providers: [
        ConnectionsStore,
        { provide: CONTACTS_API, useValue: api },
        { provide: SessionStore, useValue: { session: () => ({ photoUrl: '/me.jpg' }) } },
      ],
    });
    store = TestBed.inject(ConnectionsStore);
  });

  it('reads the map: the faces in their colours, and the lines with You', () => {
    store.open();

    expect(store.state()).toBe('ready');
    expect(store.people().map((p) => [p.name, p.accent, p.x, p.y])).toEqual([
      ['Chidi Okafor', 'sky', 0.5, 0.1],
      ['Tomás Reyes', 'leaf', 0.5, 0.9],
    ]);
    expect(store.view().lines.map((l) => l.kind)).toEqual(['family', 'partner']);
  });

  it('choosing a face focuses it, and choosing it again shows everyone (AC3)', () => {
    store.open();

    store.choose('c');
    expect(store.chosen()?.fullName).toBe('Chidi Okafor');
    expect(store.rows().map((r) => r.name)).toEqual(['You', 'Tomás Reyes']);
    expect(store.rows()[0].photoUrl).toBe('/me.jpg');

    store.choose('c');
    expect(store.focus()).toBeNull();
    expect(store.rows()).toEqual([]);
  });

  it('opens with a face chosen, and forgets one that is not on the map (AC8)', () => {
    store.open('t');
    expect(store.focus()).toBe('t');

    store.open('nobody');
    expect(store.focus()).toBeNull();
  });

  it('is empty with no connections, and failed when the map cannot be read (AC5)', () => {
    api.connectionMap.mockReturnValue(of({ people: [], connections: [] }));
    store.open();
    expect(store.empty()).toBe(true);

    api.connectionMap.mockReturnValue(throwError(() => new Error('offline')));
    store.retry();
    expect(store.state()).toBe('failed');
  });
});
