import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactDatesView, KeyDateRowView } from '../../models/contacts';
import { Toaster } from '../toasts/toaster';
import { CONTACTS_API } from './contacts-api';
import {
  DEFAULT_REMINDERS,
  DatesStore,
  NOTIFICATIONS_BLOCKED_HEADING,
  PREFERENCES_FAILED_HEADING,
} from './dates-store';
import { PUSH_SUBSCRIBER } from './push-subscriber';

const date = (id: string, occursOn: string) => ({ id, occursOn }) as KeyDateRowView;
const view = (dates: KeyDateRowView[]): ContactDatesView => ({
  dates,
  preferences: { ...DEFAULT_REMINDERS, birthdayLead: 'TwoWeeksBefore' },
});

describe('DatesStore', () => {
  const api = { dates: vi.fn(), saveReminderPreferences: vi.fn() };
  const toaster = { show: vi.fn() };
  const devices = { subscribe: vi.fn(), unsubscribe: vi.fn() };
  let store: DatesStore;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        DatesStore,
        { provide: CONTACTS_API, useValue: api },
        { provide: Toaster, useValue: toaster },
        { provide: PUSH_SUBSCRIBER, useValue: devices },
      ],
    });
    store = TestBed.inject(DatesStore);
  });

  // L2-137 AC1
  it('reads every date for the device’s day, by month, with my defaults', () => {
    api.dates.mockReturnValue(of(view([date('a', '2026-09-19'), date('b', '2026-10-05')])));
    store.open(new Date(2026, 8, 15));

    expect(api.dates).toHaveBeenCalledWith('2026-09-15', 'all');
    expect(store.months().map((m) => m.heading)).toEqual(['September', 'October']);
    expect(store.preferences().birthdayLead).toBe('TwoWeeksBefore');
  });

  // L2-137 AC2
  it('reads again for a filter', () => {
    api.dates.mockReturnValue(of(view([])));
    store.open(new Date(2026, 8, 15));
    store.show('birthdays');

    expect(api.dates).toHaveBeenLastCalledWith('2026-09-15', 'birthdays');
    expect(store.empty()).toBe(false);
  });

  // L2-137 AC4
  it('is empty with no dates at all', () => {
    api.dates.mockReturnValue(of(view([])));
    store.open();
    expect(store.empty()).toBe(true);
  });

  // L2-123 AC2
  it('fails, then reads again on Try again', () => {
    api.dates.mockReturnValueOnce(throwError(() => new Error('down')));
    store.open();
    expect(store.state()).toBe('failed');

    api.dates.mockReturnValue(of(view([])));
    store.retry();
    expect(store.state()).toBe('ready');
  });

  // L2-139 AC2, L2-124 AC3
  it('saves a changed default at once and keeps it when the save fails', () => {
    api.dates.mockReturnValue(of(view([])));
    api.saveReminderPreferences.mockReturnValue(throwError(() => new Error('down')));
    store.open();

    store.changeDefault('anniversaryLead', 'OneWeekBefore');

    expect(api.saveReminderPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ anniversaryLead: 'OneWeekBefore', birthdayLead: 'TwoWeeksBefore' }),
    );
    expect(store.preferences().anniversaryLead).toBe('OneWeekBefore');
    expect(toaster.show).toHaveBeenCalledWith(
      'danger',
      PREFERENCES_FAILED_HEADING,
      expect.any(String),
    );
  });

  // L2-140 AC2, ADR 0028
  it('subscribes this device when Phone notifications is turned on, and says when it is blocked', async () => {
    api.saveReminderPreferences.mockReturnValue(of(DEFAULT_REMINDERS));
    devices.subscribe.mockResolvedValue('blocked');

    store.changeWay('phoneNotifications', true);
    await Promise.resolve();
    await Promise.resolve();

    expect(devices.subscribe).toHaveBeenCalledOnce();
    expect(toaster.show).toHaveBeenCalledWith(
      'warning',
      NOTIFICATIONS_BLOCKED_HEADING,
      'Allow them for Popkin in your browser’s settings to get reminders on this device.',
    );
  });

  // ADR 0028
  it('forgets this device when Phone notifications is turned off, and leaves it for the email', () => {
    api.saveReminderPreferences.mockReturnValue(of(DEFAULT_REMINDERS));
    devices.unsubscribe.mockResolvedValue(undefined);

    store.changeWay('phoneNotifications', false);
    store.changeWay('mondayEmail', false);

    expect(devices.unsubscribe).toHaveBeenCalledOnce();
    expect(devices.subscribe).not.toHaveBeenCalled();
  });
});
