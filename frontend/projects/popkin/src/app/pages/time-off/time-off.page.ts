import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { ErrorScreens, PopkinFrame, TimeOffStore, UnreadTracker, isoDate } from 'api';
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
  protected readonly frame = inject(PopkinFrame);
  private readonly unread = inject(UnreadTracker);
  private readonly errors = inject(ErrorScreens);

  protected readonly link = computed(() => `/p/${this.popkinId()}/schedule`);
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
}
