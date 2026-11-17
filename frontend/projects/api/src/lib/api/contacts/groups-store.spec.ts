import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GroupView } from '../../models/groups';
import { CONTACTS_API } from './contacts-api';
import { GroupsStore } from './groups-store';
import {
  addPeopleLabel,
  addPeopleTitle,
  groupPeople,
  howKnown,
  memberNames,
  openPopkin,
  takeOutLabel,
} from './groups-text';

function group(id: string, name: string, kind: GroupView['kind']): GroupView {
  return {
    id,
    name,
    kind,
    emoji: '🏡',
    accent: 'Coral',
    note: null,
    members: [],
    comingUp: [],
    popkin: null,
  };
}

const thursday = group('g1', 'Thursday Night Group', 'SmallGroup');
const mums = group('g2', 'Mum’s house', 'Household');
const tigers = group('g3', 'Tigers U9', 'Team');

describe('GroupsStore (L2-146)', () => {
  let store: GroupsStore;
  const api = { groups: vi.fn() };

  beforeEach(() => {
    api.groups.mockReturnValue(of([mums, thursday, tigers]));
    TestBed.configureTestingModule({
      providers: [GroupsStore, { provide: CONTACTS_API, useValue: api }],
    });
    store = TestBed.inject(GroupsStore);
  });

  it('heads the groups by kind in the list’s order and leaves out a kind with none (AC1)', () => {
    store.load(new Date(2026, 8, 15));

    expect(api.groups).toHaveBeenCalledWith('2026-09-15');
    expect(store.byKind().map((k) => [k.heading, k.groups.map((g) => g.name)])).toEqual([
      ['Households', ['Mum’s house']],
      ['Small groups', ['Thursday Night Group']],
      ['Teams', ['Tigers U9']],
    ]);
  });

  it('opens the group the address names, and none for an id not theirs (AC2, AC4)', () => {
    store.load();
    store.openId.set('g1');
    expect(store.open()?.name).toBe('Thursday Night Group');

    store.openId.set('nobody');
    expect(store.open()).toBeNull();
  });

  it('puts a group made in its place, and replaces one added to (L2-147)', () => {
    store.load();
    store.saved(group('g4', 'Book club', 'Club'));
    store.saved({ ...thursday, note: 'Thursdays 7:30' });

    expect(store.groups().map((g) => g.name)).toEqual([
      'Mum’s house',
      'Thursday Night Group',
      'Tigers U9',
      'Book club',
    ]);
    expect(store.groups()[1].note).toBe('Thursdays 7:30');
  });

  it('is empty with no groups, and failed when they cannot be read (AC3)', () => {
    api.groups.mockReturnValue(of([]));
    store.load();
    expect(store.empty()).toBe(true);

    api.groups.mockReturnValue(throwError(() => new Error('offline')));
    store.load();
    expect(store.state()).toBe('failed');
  });
});

describe('Groups’ words', () => {
  it('counts the people, opens the Popkin and names the members', () => {
    expect(groupPeople(4)).toBe('4 people');
    expect(groupPeople(1)).toBe('1 person');
    expect(openPopkin('Thursday Night Group')).toBe('Open “Thursday Night Group”');
    expect(memberNames([{ firstName: 'Walt' }, { firstName: 'Ellie' }])).toBe('Walt, Ellie');
    expect(takeOutLabel('Grace')).toBe('Take Grace out');
  });

  // Ticked | The button
  it.each([
    [0, 'Add people'],
    [1, 'Add 1 person'],
    [2, 'Add 2 people'],
  ])('with %i new, reads %s (L2-147 AC3)', (n, label) => {
    expect(addPeopleLabel(n)).toBe(label);
  });

  it('titles Add people by the group, or the group before it has a name (L2-147 AC4)', () => {
    expect(addPeopleTitle('Thursday Night Group')).toBe('Add people to Thursday Night Group');
    expect(addPeopleTitle('  ')).toBe('Add people to the group');
  });

  it('reads how the person knows a member: Known as, else the circle (L2-146 AC5)', () => {
    expect(howKnown({ knownAs: 'Thursday group', circle: 'Friends' })).toBe('Thursday group');
    expect(howKnown({ knownAs: null, circle: 'Neighbours' })).toBe('Neighbours');
    expect(howKnown({ knownAs: null, circle: null })).toBeNull();
  });
});
