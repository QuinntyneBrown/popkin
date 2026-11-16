import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactRowView, PeopleView } from '../../models/contacts';
import { CONTACTS_API } from './contacts-api';
import { PeopleStore } from './people-store';

const row = (name: string, circle: ContactRowView['circle'], isClosest = false) =>
  ({ id: name, name, firstName: name.split(' ')[0], circle, isClosest }) as ContactRowView;
const people: PeopleView = {
  contacts: [
    row('Ada Okafor', 'Family', true),
    row('Chidi Okafor', 'Family', true),
    row('Femi Bankole', 'Friends'),
    row('Grace Adeyemi', 'Friends', true),
  ],
};

describe('PeopleStore', () => {
  const api = { people: vi.fn() };
  let store: PeopleStore;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [PeopleStore, { provide: CONTACTS_API, useValue: api }],
    });
    store = TestBed.inject(PeopleStore);
  });

  it('reads People for the device’s day', () => {
    api.people.mockReturnValue(of(people));
    store.open(new Date(2026, 8, 15));
    expect(api.people).toHaveBeenCalledWith('2026-09-15');
    expect(store.state()).toBe('ready');
  });

  // L2-127 AC1
  it('counts every circle and All', () => {
    api.people.mockReturnValue(of(people));
    store.open();
    expect(store.counts().map((c) => `${c.circle} ${c.count}`)).toEqual([
      'All 4',
      'Family 2',
      'Friends 2',
      'Work 0',
      'Neighbours 0',
      'Clubs 0',
    ]);
  });

  // L2-126 AC2, L2-127 AC2
  it('shows Closest only with no circle and no search, and names the list by its circle', () => {
    api.people.mockReturnValue(of(people));
    store.open();
    expect(store.closest().map((c) => c.firstName)).toEqual(['Ada', 'Chidi', 'Grace']);
    expect(store.listName()).toBe('Everyone');

    store.circle.set('Family');
    expect(store.closest()).toEqual([]);
    expect(store.shown().map((c) => c.name)).toEqual(['Ada Okafor', 'Chidi Okafor']);
    expect(store.listName()).toBe('Family');

    store.circle.set('All');
    store.search.set('gra');
    expect(store.closest()).toEqual([]);
    expect(store.shown().map((c) => c.name)).toEqual(['Grace Adeyemi']);
  });

  // L2-127 AC3
  it('has no results when a search matches nobody, within the circle chosen', () => {
    api.people.mockReturnValue(of(people));
    store.open();
    store.circle.set('Family');
    store.search.set('Femi');
    expect(store.noResults()).toBe(true);
  });

  // L2-127 AC4
  it('keeps a search typed while loading and applies it when the list arrives', () => {
    const answer = new Subject<PeopleView>();
    api.people.mockReturnValue(answer);
    store.open();
    store.search.set('chidi');
    answer.next(people);
    expect(store.shown().map((c) => c.name)).toEqual(['Chidi Okafor']);
  });

  // L2-126 AC4, L2-123 AC2, AC3
  it('is empty with nobody, failed when it cannot read, and reads again on Try again', () => {
    api.people
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of({ contacts: [] }));
    store.open();
    expect(store.state()).toBe('failed');
    store.retry();
    expect(store.empty()).toBe(true);
  });
});
