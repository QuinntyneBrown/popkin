import { Injectable, inject, signal } from '@angular/core';
import { AdminHolidayCalendar, AdminHolidayCalendars } from '../../../models/admin';
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
