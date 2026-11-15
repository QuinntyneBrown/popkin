import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ErrorScreens,
  PopkinFrame,
  TimeOffStore,
  TimeOffWeekView,
  UnreadTracker,
  isoDate,
  featureOffText,
} from 'api';
import {
  Alert,
  AppScreen,
  Button,
  ChartLegend,
  EmptyState,
  Icon,
  LeaveTable,
  LegendKey,
  MonthNav,
  PlanHeader,
  PopkinNav,
  Schedule,
  ViewNav,
  WeekChips,
} from 'components';
import { AddTimeOffData, AddTimeOffDialog } from '../../dialogs/add-time-off/add-time-off.dialog';

/**
 * Time off (L2-072): the first view of the Schedule tab, a week of the group's days off at a
 * time. The week is in the address, so a reload keeps it; without one it is the viewer's
 * current week.
 */
@Component({
  selector: 'pk-time-off-page',
  imports: [
    Alert,
    AppScreen,
    Button,
    ChartLegend,
    EmptyState,
    Icon,
    LeaveTable,
    MonthNav,
    PlanHeader,
    PopkinNav,
    RouterLink,
    Schedule,
    ViewNav,
    WeekChips,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './time-off.page.html',
})
export class TimeOffPage {
  /** The route's `:popkinId`. */
  readonly popkinId = input.required<string>();
  /** The address's `?week=`: any day of the week to show. */
  readonly week = input<string>();

  protected readonly store = inject(TimeOffStore);
  /** Who can switch Schedules on again, by who switched it off (L2-077 AC2). */
  protected readonly offText = computed(() => featureOffText('Schedules', this.store.offBy()));
  protected readonly frame = inject(PopkinFrame);
  private readonly unread = inject(UnreadTracker);
  private readonly errors = inject(ErrorScreens);
  private readonly dialog = inject(Dialog);

  protected readonly link = computed(() => `/p/${this.popkinId()}/schedule`);
  /** "Back to {Popkin name}" while Schedules is off (L2-077 AC2). */
  protected readonly home = computed(() => `/p/${this.popkinId()}`);
  protected readonly views = computed(() => [
    { label: 'Time off', link: `/p/${this.popkinId()}/schedule`, current: true },
    { label: 'This week', link: `/p/${this.popkinId()}/schedule/week`, current: false },
  ]);
  protected readonly legend: LegendKey[] = [
    { label: 'Off', swatch: 'off' },
    { label: 'Tentative', swatch: 'tentative' },
    { label: 'Working', swatch: 'working' },
    { label: 'Event days', swatch: 'tint' },
  ];
  protected readonly unreadCount = computed(() => this.unread.forPopkin(this.popkinId()));

  constructor() {
    effect(() => {
      const popkinId = this.popkinId();
      untracked(() => this.frame.open(popkinId));
    });
    effect(() => {
      const popkinId = this.popkinId();
      const week = this.week();
      // Without a week, the event's or the viewer's own current week (L2-072 AC8).
      untracked(() => this.store.open(popkinId, week, isoDate(new Date())));
    });
    // L2-051 AC1: someone who is not a member cannot tell the Popkin exists.
    effect(() => {
      if (this.store.state() === 'not-found') untracked(() => this.errors.showNotFound());
    });
  }

  /** "Add my time off" (L2-073): my row shows what was saved at once. */
  protected addMyTimeOff(event: Event): void {
    const mine = this.store.mine();
    if (!mine) return;
    const opened = this.dialog.open<TimeOffWeekView, AddTimeOffData>(AddTimeOffDialog, {
      data: { popkinId: this.popkinId(), accent: this.frame.accent(), mine },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      restoreFocus: event.currentTarget as HTMLElement,
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    });
    opened.closed.subscribe((saved) => {
      if (saved) this.store.saved(saved);
    });
  }
}
