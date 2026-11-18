import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AdminHolidayCalendar,
  AdminHolidayCalendars,
  HolidayYearPublished,
} from '../../../models/admin';
import { ADMIN_PLATFORM_API } from './admin-platform-api';

/**
 * Holiday calendars (docs/detailed-designs/admin-platform/holiday-calendars): the list, and the
 * calendar and year chosen by the address. One per page.
 */
@Injectable()
export class AdminHolidayCalendarsStore {
  private readonly api = inject(ADMIN_PLATFORM_API);

  readonly status = signal<'loading' | 'ready' | 'failed'>('loading');
  readonly list = signal<AdminHolidayCalendars | null>(null);
  readonly calendar = signal<AdminHolidayCalendar | null>(null);
  /** The holiday whose date is being changed, and the date in its field (L2-197 AC1). */
  readonly changing = signal<{ holidayId: string; date: string } | null>(null);
  /** Whether the change being saved failed; the field keeps its date. */
  readonly changeFailed = signal(false);

  private chosenId: string | null = null;
  private chosenYear: number | undefined;

  /**
   * Reads the list and the calendar the address chose; with none, the first warned calendar,
   * else the first (L2-196). "Try again" calls it too.
   */
  open(calendarId: string | null, year?: number): void {
    this.chosenId = calendarId;
    this.chosenYear = year;
    const list = this.list();
    if (list && this.status() === 'ready') {
      this.read(list);
      return;
    }
    this.status.set('loading');
    this.api.holidayCalendars().subscribe({
      next: (calendars) => {
        this.list.set(calendars);
        this.read(calendars);
      },
      error: () => this.status.set('failed'),
    });
  }

  /** "Change": the row holds a date field with the holiday's date. */
  change(holidayId: string): void {
    const holiday = this.calendar()?.holidays.find((h) => h.id === holidayId);
    if (holiday) this.changing.set({ holidayId, date: holiday.date });
    this.changeFailed.set(false);
  }

  date(date: string): void {
    this.changing.update((c) => (c ? { ...c, date } : c));
  }

  /** Escape: the row as it was. */
  cancel(): void {
    this.changing.set(null);
    this.changeFailed.set(false);
  }

  /** "Done" or Enter: saves the date, which confirms it, and reads the year again. */
  done(): void {
    const calendar = this.calendar();
    const changing = this.changing();
    if (!calendar || !changing) return;
    this.api.changeHolidayDate(calendar.id, changing.holidayId, changing.date).subscribe({
      next: () => {
        this.changing.set(null);
        this.changeFailed.set(false);
        this.reload();
      },
      error: () => this.changeFailed.set(true),
    });
  }

  /** Publishes the chosen year with the reason; once live, the list and the year read again. */
  publish(reason: string): Observable<HolidayYearPublished> {
    const calendar = this.calendar()!;
    return this.api
      .publishHolidayYear(calendar.id, calendar.year, reason)
      .pipe(tap(() => this.reload()));
  }

  /** Reads the list and the chosen calendar again, showing what is there meanwhile. */
  private reload(): void {
    const calendar = this.calendar();
    this.api.holidayCalendars().subscribe({ next: (list) => this.list.set(list) });
    if (calendar) {
      this.api.holidayCalendar(calendar.id, calendar.year).subscribe({
        next: (read) => this.calendar.set(read),
      });
    }
  }

  retry(): void {
    this.list.set(null);
    this.open(this.chosenId, this.chosenYear);
  }

  private read(list: AdminHolidayCalendars): void {
    const id =
      this.chosenId ?? (list.calendars.find((c) => c.needsDates) ?? list.calendars[0])?.id ?? null;
    if (!id) {
      this.calendar.set(null);
      this.status.set('ready');
      return;
    }
    this.api.holidayCalendar(id, this.chosenYear).subscribe({
      next: (calendar) => {
        this.calendar.set(calendar);
        this.status.set('ready');
      },
      error: () => this.status.set('failed'),
    });
  }
}
