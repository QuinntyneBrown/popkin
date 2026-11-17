import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoriesView, NoteMemoryView } from '../../models/contacts';
import { CONTACTS_API } from './contacts-api';
import { ContactMemoriesStore } from './contact-memories-store';

const kept: MemoriesView = {
  photos: [
    { id: 'p1', caption: 'Hot sauce night', day: '2026-08-08', thumbnailUrl: 't', photoUrl: 'p' },
  ],
  files: [],
  notes: [{ id: 'n1', text: 'Gift ideas', updatedOn: '2026-08-31' }],
};

describe('ContactMemoriesStore (L2-136)', () => {
  let store: ContactMemoriesStore;
  const api = { memories: vi.fn() };

  beforeEach(() => {
    api.memories.mockReturnValue(of(kept));
    TestBed.configureTestingModule({
      providers: [ContactMemoriesStore, { provide: CONTACTS_API, useValue: api }],
    });
    store = TestBed.inject(ContactMemoriesStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('reads the contact’s memories (AC1)', () => {
    store.open('c1');

    expect(api.memories).toHaveBeenCalledWith('c1');
    expect(store.memories()).toEqual(kept);
    expect(store.state()).toBe('ready');
    expect(store.empty()).toBe(false);
  });

  it('is empty with nothing kept, and failed when the read fails', () => {
    api.memories.mockReturnValueOnce(of({ photos: [], files: [], notes: [] }));
    store.open('c1');
    expect(store.empty()).toBe(true);

    api.memories.mockReturnValueOnce(throwError(() => new Error('offline')));
    store.retry();
    expect(store.state()).toBe('failed');
  });

  it('places a memory just saved first', () => {
    store.open('c1');
    const note: NoteMemoryView = { id: 'n2', text: 'Bike lights', updatedOn: '2026-09-15' };

    store.added('note', note);

    expect(store.memories().notes.map((n) => n.id)).toEqual(['n2', 'n1']);
  });
});
