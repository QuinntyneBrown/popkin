import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FollowUpView } from '../../models/contacts';
import { TodayView } from '../../models/today';
import { Toaster } from '../toasts/toaster';
import { CONTACTS_API } from './contacts-api';
import { FOLLOW_UP_FAILED_HEADING } from './follow-ups-store';
import { TodayStore } from './today-store';

const ladder: FollowUpView = {
  id: 'f1',
  text: 'Return Ruth’s ladder',
  contactId: 'c1',
  contactFirstName: 'Ruth',
  contactInitials: 'RL',
  contactAccent: 'Teal',
  contactPhotoUrl: null,
  dueOn: '2026-09-15',
  isPromise: true,
  promisedVia: 'InPerson',
  promisedOn: '2026-09-12',
  createdAt: '2026-09-12T10:00:00Z',
  doneAt: null,
};

function day(people: number): TodayView {
  return {
    firstName: 'Mara',
    people,
    next: null,
    comingUp: [],
    followUps: people ? [ladder] : [],
    overdueHabits: [],
    recently: [],
    drifting: [],
  };
}

describe('TodayStore (L2-125)', () => {
  let store: TodayStore;
  const api = { today: vi.fn(), importCandidates: vi.fn(), setFollowUpDone: vi.fn() };
  const toaster = { show: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    api.today.mockReturnValue(of(day(9)));
    api.importCandidates.mockReturnValue(of({ total: 23, popkins: [] }));
    api.setFollowUpDone.mockReturnValue(of(ladder));
    TestBed.configureTestingModule({
      providers: [
        TodayStore,
        { provide: CONTACTS_API, useValue: api },
        { provide: Toaster, useValue: toaster },
      ],
    });
    store = TestBed.inject(TodayStore);
  });

  it('reads the device’s day, and loads until it comes', () => {
    const answer = new Subject<TodayView>();
    api.today.mockReturnValue(answer);

    store.open(new Date(2026, 8, 15));

    expect(api.today).toHaveBeenCalledWith('2026-09-15');
    expect(store.state()).toBe('loading');
    answer.next(day(9));
    expect(store.state()).toBe('ready');
    expect(store.today()?.people).toBe(9);
    expect(api.importCandidates).not.toHaveBeenCalled();
  });

  it('with nobody in Contacts, reads how many are ready to import (AC8)', () => {
    api.today.mockReturnValue(of(day(0)));

    store.open();

    expect(store.readyToImport()).toBe(23);
  });

  it('with nobody known to be in Contacts, reads only the import count (AC8)', () => {
    store.openEmpty();

    expect(api.today).not.toHaveBeenCalled();
    expect(store.state()).toBe('ready');
    expect(store.readyToImport()).toBe(23);
  });

  it('leaves the import count out when it cannot be read (AC8)', () => {
    api.today.mockReturnValue(of(day(0)));
    api.importCandidates.mockReturnValue(throwError(() => new Error('offline')));

    store.open();

    expect(store.state()).toBe('ready');
    expect(store.readyToImport()).toBe(0);
  });

  it('says it failed, and Try again reads again (L2-123 AC2, AC3)', () => {
    api.today.mockReturnValue(throwError(() => new Error('offline')));
    store.open();
    expect(store.state()).toBe('failed');

    api.today.mockReturnValue(of(day(9)));
    store.retry();

    expect(store.state()).toBe('ready');
  });

  it('ticks a follow-up done at once with Undo, and Undo opens it again (L2-142)', () => {
    store.open();

    store.toggle(ladder);

    expect(store.done().has('f1')).toBe(true);
    expect(api.setFollowUpDone).toHaveBeenCalledWith('f1', true);
    const [kind, heading, text, action] = toaster.show.mock.calls[0];
    expect([kind, heading, text, action.label]).toEqual([
      'success',
      'Marked done',
      'Return Ruth’s ladder.',
      'Undo',
    ]);
    action.run();
    expect(store.done().has('f1')).toBe(false);
    expect(api.setFollowUpDone).toHaveBeenLastCalledWith('f1', false);
  });

  it('puts a refused tick back and says so (L2-124 AC3)', () => {
    store.open();
    api.setFollowUpDone.mockReturnValue(throwError(() => new Error('offline')));

    store.toggle(ladder);

    expect(store.done().has('f1')).toBe(false);
    expect(toaster.show).toHaveBeenLastCalledWith(
      'danger',
      FOLLOW_UP_FAILED_HEADING,
      'Check your connection and try again.',
    );
  });
});
