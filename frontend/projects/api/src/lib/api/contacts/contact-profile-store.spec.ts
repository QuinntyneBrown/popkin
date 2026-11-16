import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactProfileView, HabitView } from '../../models/contacts';
import { Toaster } from '../toasts/toaster';
import { CONTACTS_API } from './contacts-api';
import { ContactProfileStore } from './contact-profile-store';

const id = '566025c4-1a2b-4c3d-8e9f-0a1b2c3d4e5f';
const chidi = {
  id,
  name: 'Chidi Okafor',
  firstName: 'Chidi',
  isClosest: true,
} as ContactProfileView;
const problem = (status: number, code?: string) =>
  throwError(() => new HttpErrorResponse({ status, error: code ? { code } : null }));

describe('ContactProfileStore', () => {
  const api = {
    contact: vi.fn(),
    addToClosest: vi.fn(),
    takeOutOfClosest: vi.fn(),
    endHabit: vi.fn(),
    resumeHabit: vi.fn(),
  };
  let store: ContactProfileStore;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [ContactProfileStore, { provide: CONTACTS_API, useValue: api }],
    });
    store = TestBed.inject(ContactProfileStore);
  });

  it('is loading, keeping the first name it was opened with, until the profile answers', () => {
    const answer = new Subject<ContactProfileView>();
    api.contact.mockReturnValue(answer);

    store.open(id, 'Chidi');

    expect(store.state()).toBe('loading');
    expect(store.knownFirstName()).toBe('Chidi');
    answer.next(chidi);
    expect(store.state()).toBe('ready');
    expect(store.profile()).toBe(chidi);
  });

  // L2-122 AC2
  it.each([
    ['a contact not mine', () => problem(404, 'contact_not_found'), 'notFound'],
    ['a failed read', () => problem(0), 'failed'],
    ['a server error', () => problem(500), 'failed'],
  ])('maps %s to %s', (_, answer, state) => {
    api.contact.mockReturnValue(answer());
    store.open(id);
    expect(store.state()).toBe(state);
  });

  it('never asks for an address that cannot name a contact', () => {
    store.open('not-a-contact');
    expect(store.state()).toBe('notFound');
    expect(api.contact).not.toHaveBeenCalled();
  });

  // L2-123 AC3
  it('reads again on Try again', () => {
    api.contact.mockReturnValueOnce(problem(0)).mockReturnValueOnce(of(chidi));
    store.open(id);
    store.retry();
    expect(store.state()).toBe('ready');
  });

  // L2-131 AC2, AC4
  it('takes them out of Closest, or puts them in, then reads the profile again', () => {
    api.contact.mockReturnValue(of(chidi));
    api.takeOutOfClosest.mockReturnValue(of(undefined));
    api.addToClosest.mockReturnValue(of(undefined));
    store.open(id);

    store.takeOutOfClosest();
    store.addToClosest();

    expect(api.takeOutOfClosest).toHaveBeenCalledWith(id);
    expect(api.addToClosest).toHaveBeenCalledWith(id);
    expect(api.contact).toHaveBeenCalledTimes(3);
    expect(store.state()).toBe('ready');
  });

  describe('End this habit (L2-144 AC3)', () => {
    const lunch = { id: 'h1', what: 'Lunch', contactFirstName: 'Chidi' } as HabitView;

    beforeEach(() => {
      api.contact.mockReturnValue(of({ ...chidi, habit: lunch }));
      api.endHabit.mockReturnValue(of(undefined));
      api.resumeHabit.mockReturnValue(of(lunch));
      store.open(id);
    });

    it('takes it off the profile at once, saying so with Undo', () => {
      store.endHabit();

      expect(api.endHabit).toHaveBeenCalledWith('h1');
      expect(store.profile()?.habit).toBeNull();
      const toast = TestBed.inject(Toaster).toasts().at(-1)!;
      expect(toast.heading).toBe('Lunch with Chidi ended');
      expect(toast.action?.label).toBe('Undo');
    });

    it('Undo brings it back', () => {
      store.endHabit();

      TestBed.inject(Toaster).toasts().at(-1)!.action!.run();

      expect(api.resumeHabit).toHaveBeenCalledWith('h1');
      expect(store.profile()?.habit).toEqual(lunch);
    });

    it('a failed end puts it back and says so', () => {
      api.endHabit.mockReturnValue(problem(0));

      store.endHabit();

      expect(store.profile()?.habit).toEqual(lunch);
      expect(TestBed.inject(Toaster).toasts().at(-1)!.variant).toBe('danger');
    });
  });
});
