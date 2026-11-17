import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactReminderView } from '../../models/reminders';
import { Toaster } from '../toasts/toaster';
import { ContactRemindersStore } from './contact-reminders-store';
import { CONTACTS_API } from './contacts-api';

const grace: ContactReminderView = {
  id: 'r1',
  kind: 'KeyDate',
  contactId: 'c1',
  firstName: 'Grace',
  words: 'Grace turns 33 on Saturday',
  dueOn: '2026-09-19',
};

const ladder: ContactReminderView = {
  id: 'r2',
  kind: 'FollowUp',
  contactId: null,
  firstName: null,
  words: 'Return Ruth’s ladder is due today',
  dueOn: '2026-09-15',
};

describe('ContactRemindersStore (L2-140 AC1)', () => {
  let store: ContactRemindersStore;
  let toaster: Toaster;
  const router = { url: '/contacts', navigateByUrl: vi.fn() };
  const api = {
    reminders: vi.fn(),
    dismissReminder: vi.fn(),
    saveTimeZone: vi.fn(),
  };
  const shown = () => toaster.toasts().map((t) => [t.heading, t.action?.label ?? null]);

  beforeEach(() => {
    vi.useFakeTimers();
    api.reminders.mockReturnValue(of([grace, ladder]));
    api.dismissReminder.mockReturnValue(of(undefined));
    api.saveTimeZone.mockReturnValue(of(undefined));
    TestBed.configureTestingModule({
      providers: [
        { provide: CONTACTS_API, useValue: api },
        { provide: Router, useValue: router },
      ],
    });
    store = TestBed.inject(ContactRemindersStore);
    toaster = TestBed.inject(Toaster);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('shows each reminder until dismissed, with its profile when it names someone', () => {
    store.open();
    vi.advanceTimersByTime(60_000);

    expect(shown()).toEqual([
      ['Grace turns 33 on Saturday', 'Open Grace’s profile'],
      ['Return Ruth’s ladder is due today', null],
    ]);
  });

  it('saves the device’s zone once, however often Contacts opens', () => {
    store.open();
    store.open();

    expect(api.saveTimeZone).toHaveBeenCalledOnce();
    expect(api.saveTimeZone).toHaveBeenCalledWith(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it('shows a reminder once when Contacts opens again', () => {
    store.open();
    store.open();

    expect(shown()).toHaveLength(2);
  });

  it('opens the profile and dismisses the reminder', () => {
    store.open();

    toaster.act(toaster.toasts()[0]);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/contacts/people/c1');
    expect(api.dismissReminder).toHaveBeenCalledWith('r1');
    expect(shown()).toEqual([['Return Ruth’s ladder is due today', null]]);
  });

  it('puts a reminder back when its dismissal fails', () => {
    api.dismissReminder.mockReturnValue(throwError(() => new Error('offline')));
    store.open();

    toaster.dismiss(toaster.toasts()[1].id);

    expect(shown().map(([heading]) => heading)).toEqual([
      'Grace turns 33 on Saturday',
      'Return Ruth’s ladder is due today',
    ]);
  });

  it('reads again when the window regains focus in Contacts, and not elsewhere', () => {
    store.open();
    api.reminders.mockReturnValue(
      of([grace, ladder, { ...ladder, id: 'r3', words: 'Lunch with Chidi is overdue' }]),
    );

    router.url = '/popkins';
    window.dispatchEvent(new Event('focus'));
    expect(shown()).toHaveLength(2);
    router.url = '/contacts/dates';
    window.dispatchEvent(new Event('focus'));

    expect(shown().map(([heading]) => heading)).toContain('Lunch with Chidi is overdue');
    expect(shown()).toHaveLength(3);
  });

  it('keeps quiet when the reminders cannot be read', () => {
    api.reminders.mockReturnValue(throwError(() => new Error('offline')));

    store.open();

    expect(shown()).toEqual([]);
  });
});
