import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import {
  AdminHolidayCalendarsStore,
  AdminSessionStore,
  HOLIDAY_STATUS,
  HolidayYearPublished,
  Toaster,
  changeHolidayLabel,
  holidayDateLabel,
  holidaysPublishedToast,
  holidaysYearLine,
  publishHolidaysDialog,
  publishYearLabel,
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
  DataTableAction,
  DataTableCell,
  DataTableDate,
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
import {
  NotificationActionData,
  NotificationActionDialog,
} from '../../dialogs/notification-action/notification-action.dialog';

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
  private readonly session = inject(AdminSessionStore);
  private readonly dialog = inject(Dialog);
  private readonly toaster = inject(Toaster);

  /** Why the signed-in admin cannot change or publish: a Viewer (L2-197 AC5). */
  protected readonly blocked = computed(() => this.session.blockedReason('ChangeHolidayCalendars'));
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
    { label: 'Change', hidden: true, end: true },
  ];

  protected readonly groups = computed<DataTableGroup[]>(() => [
    {
      rows: (this.store.calendar()?.holidays ?? []).map((holiday) => {
        const changing = this.store.changing();
        const status = changing?.holidayId === holiday.id ? 'Confirmed' : holiday.status;
        const name: DataTableCell = {
          text: holiday.name,
          kind: 'titled',
          sub: holiday.note ?? undefined,
        };
        const pill: DataTableCell = {
          text: HOLIDAY_STATUS[status].text,
          kind: 'status',
          tone: HOLIDAY_STATUS[status].tone,
        };
        if (changing?.holidayId === holiday.id) {
          return {
            id: holiday.id,
            cells: [
              name,
              {
                text: '',
                kind: 'date',
                label: holidayDateLabel(holiday.name),
                value: changing.date,
              },
              pill,
              { text: 'Done', kind: 'action', action: 'done' },
            ],
          };
        }
        // A holiday by rule offers no "Change" (L2-197 AC1).
        const change: DataTableCell =
          holiday.status === 'ByRule'
            ? { text: '' }
            : {
                text: 'Change',
                kind: 'action',
                action: 'change',
                label: changeHolidayLabel(holiday.name),
                disabledReason: this.blocked(),
              };
        return { id: holiday.id, cells: [name, { text: holidayDate(holiday.date) }, pill, change] };
      }),
    },
  ]);

  protected readonly tableLabel = computed(() => {
    const calendar = this.store.calendar();
    return calendar ? `${calendar.name} in ${calendar.year}` : '';
  });

  protected readonly noDates = computed(() => noDatesText(this.store.calendar()?.year ?? 0));

  /** The line under the table, and "Publish {year}" while the year is not live (L2-197 AC2). */
  protected readonly foot = computed(() => {
    const calendar = this.store.calendar();
    if (!calendar) return null;
    const line = holidaysYearLine(calendar, new Date());
    if (!line) return null;
    return { line, publish: calendar.publishedAt ? null : publishYearLabel(calendar.year) };
  });

  constructor() {
    effect(() => {
      const year = Number(this.year());
      this.store.open(
        this.calendarId() ?? null,
        Number.isInteger(year) && year > 0 ? year : undefined,
      );
    });
  }

  protected acted(event: DataTableAction): void {
    if (event.action === 'change') this.store.change(String(event.rowId));
    else if (event.action === 'done') this.store.done();
    else if (event.action === 'cancel') this.store.cancel();
  }

  protected dated(event: DataTableDate): void {
    this.store.date(event.value);
  }

  /** "Publish {calendar} for {year}?" with a reason; once live, the toast (L2-197 AC3, AC4). */
  protected publish(): void {
    const calendar = this.store.calendar();
    if (!calendar || this.blocked()) return;
    this.dialog
      .open<HolidayYearPublished, NotificationActionData<HolidayYearPublished>>(
        NotificationActionDialog<HolidayYearPublished>,
        {
          data: {
            text: publishHolidaysDialog(calendar),
            danger: false,
            send: (reason) => this.store.publish(reason ?? ''),
          },
          ariaLabelledBy: 'dlg-title',
          ariaDescribedBy: 'dlg-desc',
          // Focus starts in the reason (L2-087 AC1).
          autoFocus: 'textarea',
          // pk-dialog draws its own backdrop, as the mocks do.
          hasBackdrop: false,
          ariaModal: true,
        },
      )
      .closed.subscribe((published) => {
        if (published) this.toaster.show('success', ...holidaysPublishedToast(published));
      });
  }

  /** A year's tab: its own address, so the browser's back returns to the one before. */
  protected chooseYear(year: string): void {
    const id = this.store.calendar()?.id;
    if (id) void this.router.navigate(['/holidays', id], { queryParams: { year } });
  }
}
