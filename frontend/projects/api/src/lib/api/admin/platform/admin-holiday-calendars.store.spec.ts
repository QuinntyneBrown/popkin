import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminHolidayCalendar, AdminHolidayCalendarRow } from '../../../models/admin';
import { ADMIN_PLATFORM_API } from './admin-platform-api';
import { AdminHolidayCalendarsStore } from './admin-holiday-calendars.store';

const row = (id: string, needsDates: boolean): AdminHolidayCalendarRow => ({
  id,
  name: id,
  holds: '',
  people: 0,
  datesThrough: 2026,
  draft: false,
  needsDates,
});

const calendar = (id: string, year: number): AdminHolidayCalendar => ({
  id,
  name: id,
  howSet: '',
  years: [2026, 2027, 2028],
  year,
  people: 0,
  popkins: 0,
  lastEdited: null,
  publishedAt: null,
  holidays: [{ id: 'eid', name: 'Eid', note: null, date: '2027-03-10', status: 'Estimated' }],
  estimates: 1,
});

describe('AdminHolidayCalendarsStore (L2-196)', () => {
  const holidayCalendars = vi.fn();
  const holidayCalendar = vi.fn();
  const changeHolidayDate = vi.fn();
  const publishHolidayYear = vi.fn();
  let store: AdminHolidayCalendarsStore;

  beforeEach(() => {
    holidayCalendars.mockReturnValue(
      of({
        thisYear: 2026,
        calendars: [row('us', false), row('islamic', true)],
        withoutNextYear: { names: ['islamic'], people: 0 },
      }),
    );
    holidayCalendar.mockImplementation((id: string, year?: number) =>
      of(calendar(id, year ?? 2027)),
    );
    TestBed.configureTestingModule({
      providers: [
        AdminHolidayCalendarsStore,
        {
          provide: ADMIN_PLATFORM_API,
          useValue: { holidayCalendars, holidayCalendar, changeHolidayDate, publishHolidayYear },
        },
      ],
    });
    store = TestBed.inject(AdminHolidayCalendarsStore);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('opens on the first warned calendar when the address chooses none', () => {
    store.open(null);

    expect(store.status()).toBe('ready');
    expect(holidayCalendar).toHaveBeenCalledWith('islamic', undefined);
    expect(store.calendar()?.id).toBe('islamic');
  });

  it('reads the chosen calendar and year without reading the list again', () => {
    store.open(null);
    store.open('us', 2028);

    expect(holidayCalendars).toHaveBeenCalledTimes(1);
    expect(store.calendar()?.year).toBe(2028);
  });

  it('fails when the list cannot be read, and tries again', () => {
    holidayCalendars.mockReturnValueOnce(throwError(() => new Error('down')));
    store.open(null);
    expect(store.status()).toBe('failed');

    store.retry();
    expect(store.status()).toBe('ready');
  });

  it('changes a date: the field holds it, Done saves it, Escape puts it back (L2-197 AC1)', () => {
    changeHolidayDate.mockReturnValue(of({}));
    store.open(null);

    store.change('eid');
    expect(store.changing()).toEqual({ holidayId: 'eid', date: '2027-03-10' });
    store.cancel();
    expect(store.changing()).toBeNull();

    store.change('eid');
    store.date('2027-03-11');
    store.done();
    expect(changeHolidayDate).toHaveBeenCalledWith('islamic', 'eid', '2027-03-11');
    expect(store.changing()).toBeNull();
    expect(holidayCalendar).toHaveBeenLastCalledWith('islamic', 2027);
  });

  it('keeps the field when a change fails', () => {
    changeHolidayDate.mockReturnValue(throwError(() => new Error('down')));
    store.open(null);
    store.change('eid');
    store.done();

    expect(store.changing()).not.toBeNull();
    expect(store.changeFailed()).toBe(true);
  });

  it('publishes the chosen year and reads the list again (L2-197 AC4)', () => {
    publishHolidayYear.mockReturnValue(
      of({ calendarName: 'islamic', year: 2027, people: 0, popkins: 0 }),
    );
    store.open(null);

    store.publish('Dates').subscribe();

    expect(publishHolidayYear).toHaveBeenCalledWith('islamic', 2027, 'Dates');
    expect(holidayCalendars).toHaveBeenCalledTimes(2);
  });
});
