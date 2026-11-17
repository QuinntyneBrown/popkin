import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HabitView } from '../../models/contacts';
import { Toaster } from '../toasts/toaster';
import { CONTACTS_API } from './contacts-api';
import { HabitsStore } from './habits-store';

function habit(id: string, first: string, dueOn: string, rhythm: HabitView['rhythm']): HabitView {
  return {
    id,
    contactId: `c-${id}`,
    contactFirstName: first,
    contactName: `${first} Okafor`,
    contactInitials: `${first[0]}O`,
    contactAccent: 'Sky',
    contactPhone: null,
    contactPhotoUrl: null,
    what: 'Lunch',
    rhythm,
    startedOn: '2026-01-01',
    lastTime: '2026-08-30',
    dueOn,
    kept: [{ id: `${id}-k`, on: '2026-08-30' }],
  };
}

const chidi = habit('h1', 'Chidi', '2026-09-13', 'EveryTwoWeeks');
const ada = habit('h2', 'Ada', '2026-09-20', 'Weekly');
const sam = habit('h3', 'Sam', '2026-09-10', 'Weekly');

describe('HabitsStore (L2-143, L2-144)', () => {
  let store: HabitsStore;
  let toaster: Toaster;
  const api = { habits: vi.fn(), keepHabit: vi.fn(), unkeepHabit: vi.fn() };

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 8, 15, 8, 40) });
    api.habits.mockReturnValue(of([sam, chidi, ada]));
    api.keepHabit.mockImplementation((id: string, keptOn: string) =>
      of({
        keptId: 'k-new',
        habit: {
          ...chidi,
          lastTime: keptOn,
          dueOn: '2026-09-29',
          kept: [{ id: 'k-new', on: keptOn }, ...chidi.kept],
        },
      }),
    );
    api.unkeepHabit.mockReturnValue(of(chidi));
    TestBed.configureTestingModule({
      providers: [HabitsStore, { provide: CONTACTS_API, useValue: api }],
    });
    store = TestBed.inject(HabitsStore);
    toaster = TestBed.inject(Toaster);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('leads with the habit overdue longest; the rest are rows, soonest first (L2-143 AC2, AC7)', () => {
    store.open();

    expect(store.state()).toBe('ready');
    expect(store.leading()?.id).toBe('h3');
    expect(store.rows().map((h) => h.id)).toEqual(['h1', 'h2']);
  });

  it('nothing overdue leads with nothing', () => {
    api.habits.mockReturnValue(of([ada]));
    store.open();

    expect(store.leading()).toBeNull();
    expect(store.rows().map((h) => h.id)).toEqual(['h2']);
  });

  it('We met up logs it for its period on the device’s day, with Undo (L2-144 AC1)', () => {
    api.habits.mockReturnValue(of([chidi, ada]));
    store.open();

    store.keep(chidi);

    expect(api.keepHabit).toHaveBeenCalledWith('h1', '2026-09-15', expect.any(String));
    expect(store.logged('h1')).toBe(true);
    expect(store.leading()?.dueOn).toBe('2026-09-29');
    const toast = toaster.toasts().at(-1)!;
    expect(toast.heading).toBe('Lunch with Chidi logged');
    expect(toast.text).toBe('Your next one is due by Tue, Sep 29.');
    expect(toast.action?.label).toBe('Undo');
  });

  it('Undo puts the habit back as it was (L2-144 AC2)', () => {
    api.habits.mockReturnValue(of([chidi, ada]));
    store.open();
    store.keep(chidi);

    toaster.toasts().at(-1)!.action!.run();

    expect(api.unkeepHabit).toHaveBeenCalledWith('h1', 'k-new');
    expect(store.logged('h1')).toBe(false);
    expect(store.leading()).toEqual(chidi);
  });

  it('a keep that fails is put back, and Try again sends it again', () => {
    api.habits.mockReturnValue(of([chidi, ada]));
    api.keepHabit.mockReturnValueOnce(throwError(() => new Error('offline')));
    store.open();

    store.keep(chidi);

    expect(store.logged('h1')).toBe(false);
    expect(store.leading()).toEqual(chidi);
    const toast = toaster.toasts().at(-1)!;
    expect(toast.variant).toBe('danger');
    expect(toast.heading).toBe('We couldn’t log that');
    const first = api.keepHabit.mock.calls[0][2];

    toast.action!.run();

    expect(api.keepHabit.mock.calls[1][2]).toBe(first);
    expect(store.logged('h1')).toBe(true);
  });

  it('a failed read is failed, and Try again reads again', () => {
    api.habits.mockReturnValueOnce(throwError(() => new Error('offline')));
    store.open();
    expect(store.state()).toBe('failed');

    store.retry();
    expect(store.state()).toBe('ready');
  });
});
