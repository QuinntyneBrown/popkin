import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import {
  AdminHolidayCalendarsStore,
  HOLIDAY_STATUS,
  calendarPeople,
  datesThrough,
  holidayDate,
  holidaysBannerHeading,
  holidaysBannerText,
  lastEditedText,
  noDatesText,
} from 'api';
import {
  Banner,
  Button,
  DataTable,
  DataTableColumn,
  DataTableGroup,
  EmptyState,
  Icon,
  KeyValue,
  KeyValues,
  PageHead,
  Panel,
  PanelGrid,
  ReportList,
  ReportListItem,
  SegmentedControl,
  SegmentedOption,
  Skeleton,
} from 'components';

const SUB =
  'Calendars people turn on for their own Important days or for a Popkin. Changes reach everyone within an hour.';

/**
 * Holiday calendars (docs/detailed-designs/admin-platform/holiday-calendars): which calendars lack
 * next year's dates, and a chosen calendar's year of holidays (L2-196). The address holds the
 * choice: `/holidays/:calendarId?year=`.
 */
@Component({
  selector: 'pk-holidays-page',
  imports: [
    Banner,
    Button,
    DataTable,
    EmptyState,
    Icon,
    KeyValues,
    PageHead,
    Panel,
    PanelGrid,
    ReportList,
    SegmentedControl,
    Skeleton,
  ],
  providers: [AdminHolidayCalendarsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './holidays.page.html',
})
export class HolidaysPage {
  readonly calendarId = input<string>();
  readonly year = input<string>();

  protected readonly store = inject(AdminHolidayCalendarsStore);
  private readonly router = inject(Router);
  protected readonly sub = SUB;

  protected readonly banner = computed(() => {
    const list = this.store.list();
    if (!list || list.withoutNextYear.names.length === 0) return null;
    return {
      heading: holidaysBannerHeading(list.withoutNextYear.names, list.thisYear),
      text: holidaysBannerText(list.withoutNextYear.people),
    };
  });

  protected readonly items = computed<ReportListItem[]>(() => {
    const chosen = this.store.calendar()?.id;
    return (this.store.list()?.calendars ?? []).map((row) => ({
      id: row.id,
      icon: 'calendar',
      reason: row.name,
      where: row.holds,
      meta: calendarPeople(row.people),
      state: datesThrough(row),
      pill: row.needsDates ? 'warn' : row.draft ? 'neutral' : null,
      link: ['/holidays', row.id],
      current: row.id === chosen,
    }));
  });

  protected readonly years = computed<SegmentedOption[]>(() =>
    (this.store.calendar()?.years ?? []).map((y) => ({ value: String(y), label: String(y) })),
  );

  protected readonly figures = computed<KeyValue[]>(() => {
    const calendar = this.store.calendar();
    if (!calendar) return [];
    const count = (n: number) => new Intl.NumberFormat('en-GB').format(n);
    return [
      { term: 'People using it', value: count(calendar.people) },
      { term: 'Popkins using it', value: count(calendar.popkins) },
      { term: 'Last edited', value: lastEditedText(calendar.lastEdited) },
    ];
  });

  protected readonly columns: DataTableColumn[] = [
    { label: 'Holiday' },
    { label: 'Date' },
    { label: 'Status' },
  ];

  protected readonly groups = computed<DataTableGroup[]>(() => [
    {
      rows: (this.store.calendar()?.holidays ?? []).map((holiday) => ({
        id: holiday.id,
        cells: [
          { text: holiday.name, kind: 'kind', sub: holiday.note ?? undefined },
          { text: holidayDate(holiday.date) },
          {
            text: HOLIDAY_STATUS[holiday.status].text,
            kind: 'status',
            tone: HOLIDAY_STATUS[holiday.status].tone,
          },
        ],
      })),
    },
  ]);

  protected readonly tableLabel = computed(() => {
    const calendar = this.store.calendar();
    return calendar ? `${calendar.name} in ${calendar.year}` : '';
  });

  protected readonly noDates = computed(() => noDatesText(this.store.calendar()?.year ?? 0));

  constructor() {
    effect(() => {
      const year = Number(this.year());
      this.store.open(
        this.calendarId() ?? null,
        Number.isInteger(year) && year > 0 ? year : undefined,
      );
    });
  }

  /** A year's tab: its own address, so the browser's back returns to the one before. */
  protected chooseYear(year: string): void {
    const id = this.store.calendar()?.id;
    if (id) void this.router.navigate(['/holidays', id], { queryParams: { year } });
  }
}
