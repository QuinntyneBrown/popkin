import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportCandidatesView, ImportPersonView } from '../../models/import';
import { CONTACTS_API } from './contacts-api';
import { ImportContactsStore } from './import-contacts-store';
import {
  importLabel,
  importPeople,
  importingLabel,
  readyToImport,
  showMore,
} from './import-contacts-text';

function person(personId: string, name: string): ImportPersonView {
  return { personId, name, initials: name[0], accent: 'Teal', photoUrl: null };
}

const walt = person('walt', 'Walt Brennan');
const dev = person('dev', 'Dev Patel');
const joel = person('joel', 'Joel Kim');

const candidates: ImportCandidatesView = {
  total: 3,
  popkins: [
    {
      popkinId: 'p1',
      name: 'Lakeside Weekend',
      emoji: '🏕️',
      colour: 'Teal',
      peopleCount: 2,
      people: [dev, walt],
    },
    {
      popkinId: 'p2',
      name: 'Thursday Night Group',
      emoji: '🕯️',
      colour: 'Amber',
      peopleCount: 2,
      people: [joel, walt],
    },
  ],
};

describe('ImportContactsStore (L2-151)', () => {
  let store: ImportContactsStore;
  const api = { importCandidates: vi.fn(), importPeople: vi.fn() };

  beforeEach(() => {
    api.importCandidates.mockReturnValue(of(candidates));
    api.importPeople.mockReset();
    TestBed.configureTestingModule({
      providers: [ImportContactsStore, { provide: CONTACTS_API, useValue: api }],
    });
    store = TestBed.inject(ImportContactsStore);
    store.load();
  });

  it('ticks everyone at first, counting Walt once (AC1, AC2)', () => {
    expect(store.state()).toBe('ready');
    expect(store.count()).toBe(3);
  });

  it('keeps one tick per person, shared by every Popkin listing them (AC2)', () => {
    store.setTicks(['joel', 'walt'], ['joel']);

    expect(store.ticked().has('walt')).toBe(false);
    expect(store.count()).toBe(2);
    store.toggle('walt');
    expect(store.count()).toBe(3);
  });

  it('ticks nobody, then everyone again (AC3, AC7)', () => {
    store.tickAll(false);
    expect(store.count()).toBe(0);

    store.tickAll(true);
    expect(store.count()).toBe(3);
  });

  it('sends nothing with nobody ticked (AC3)', () => {
    store.tickAll(false);
    store.import(() => undefined);

    expect(api.importPeople).not.toHaveBeenCalled();
  });

  it('sends those ticked once each, and keeps every tick when it fails (AC4, AC9)', () => {
    api.importPeople.mockReturnValue(throwError(() => new Error('offline')));
    store.toggle('dev');
    store.import(() => undefined);

    expect(api.importPeople).toHaveBeenCalledWith({
      clientId: expect.any(String),
      personIds: ['walt', 'joel'],
    });
    expect(store.state()).toBe('importFailed');
    expect(store.count()).toBe(2);
  });

  it('answers how many were imported (AC4)', () => {
    api.importPeople.mockReturnValue(of({ imported: 3 }));
    let imported = 0;
    store.import((n) => (imported = n));

    expect(imported).toBe(3);
  });

  it('is nobody to import with no candidates, and failed when they cannot be read (AC8)', () => {
    api.importCandidates.mockReturnValue(of({ total: 0, popkins: [] }));
    store.load();
    expect(store.nobody()).toBe(true);

    api.importCandidates.mockReturnValue(throwError(() => new Error('offline')));
    store.load();
    expect(store.state()).toBe('failed');
  });
});

describe('Import’s words', () => {
  // Ticked | The button
  it.each([
    [0, 'Import nobody'],
    [1, 'Import 1 person'],
    [23, 'Import 23 people'],
  ])('with %i ticked, reads %s (AC1, AC3)', (n, label) => {
    expect(importLabel(n)).toBe(label);
  });

  it('says what is sent, counts a Popkin’s people and the rest, and Today’s line', () => {
    expect(importingLabel(23)).toBe('Importing 23 people…');
    expect(importingLabel(1)).toBe('Importing 1 person…');
    expect(importPeople(13)).toBe('13 people');
    expect(showMore(9)).toBe('Show 9 more');
    expect(readyToImport(23)).toBe(
      '23 people from your Popkins are ready to import. Only you can see your contacts.',
    );
  });
});
