import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TimeOffStatus, TimeOffWeekView } from '../../models/schedule';
import { accentOf } from '../../models/popkin';
import {
  addDays,
  daysOf,
  firstWeekOf,
  holdsEvent,
  mondayOf,
  monthOf,
  weekLabel,
  weeksOfMonth,
} from './schedule-weeks';
import { SCHEDULE_API } from './schedule-api';
import { dayHeading, isMany, offCount } from './time-off-text';

/** A day's heading in the table: "Mon", "15", "5 of 6 off". */
export interface TimeOffDay {
  day: string;
  weekday: string;
  date: string;
  weekend: boolean;
  /** "5 of 6 off"; null on a weekend. */
  off: string | null;
  /** Every member but at most one is off (L2-072 AC6). */
  many: boolean;
  /** The event's label over one of its days; null on any other day (L2-072 AC5). */
  event: string | null;
}

export interface TimeOffRow {
  membershipId: string;
  name: string;
  avatar: { initials: string; accent: string; photoUrl: string | null };
  isMe: boolean;
  days: TimeOffStatus[];
}

/** The table of a week, as `pk-leave-table` draws it. */
export interface TimeOffTable {
  week: string;
  /** "Feb 15 – 21". */
  label: string;
  days: TimeOffDay[];
  rows: TimeOffRow[];
}

/** A week chip: "Feb 15 – 21", pressed when chosen, with a dot when it holds the event. */
export interface WeekChip {
  week: string;
  label: string;
  pressed: boolean;
  event: boolean;
}

/** The month, its weeks and the steps around the chosen week (L2-072 AC3, AC7). */
export interface TimeOffNav {
  month: string;
  year: string;
  weeks: WeekChip[];
  previousWeek: string;
  nextWeek: string;
  previousMonth: string;
  nextMonth: string;
  /** "Go to Cabin week" while another week is chosen; null on its week or with no event. */
  goTo: { label: string; week: string } | null;
}

export type TimeOffState = 'loading' | 'ready' | 'error' | 'off' | 'not-found';

/** Time off of one Popkin, one week at a time (docs/detailed-designs/schedules/time-off). One per screen. */
@Injectable()
export class TimeOffStore {
  private readonly api = inject(SCHEDULE_API);

  private popkinId = '';
  /** The week asked for; none opens on the week the API names (L2-072 AC8). */
  private monday?: string;
  private today = '';
  private reading?: Subscription;
  private readonly view = signal<TimeOffWeekView | null>(null);

  readonly state = signal<TimeOffState>('loading');
  readonly table = computed(() => {
    const view = this.view();
    return view ? tableOf(view) : null;
  });
  /** Nobody has entered time off in this week (L2-072 AC10). */
  readonly nobodyYet = computed(
    () =>
      this.view()?.members.every((member) =>
        member.days.every((day) => day === 'Working' || day === 'Weekend'),
      ) ?? false,
  );

  readonly nav = computed(() => {
    const view = this.view();
    return view ? navOf(view) : null;
  });

  /** Opens the week of `day`, or with none the week the API names; `today` is the viewer's. */
  open(popkinId: string, day: string | undefined, today: string): void {
    // Another week of the same Popkin keeps the table on screen until it answers.
    if (popkinId !== this.popkinId) this.view.set(null);
    this.popkinId = popkinId;
    this.monday = day ? mondayOf(day) : undefined;
    this.today = today;
    this.read();
  }

  retry(): void {
    this.view.set(null);
    this.read();
  }

  private read(): void {
    // A week chosen later cancels the read of an earlier one.
    this.reading?.unsubscribe();
    if (!this.view()) this.state.set('loading');
    this.reading = this.api
      .timeOff(this.popkinId, this.monday ? { week: this.monday } : { today: this.today })
      .subscribe({
        next: (view) => {
          this.view.set(view);
          this.state.set('ready');
        },
        error: (error: unknown) => this.state.set(failureOf(error)),
      });
  }
}

function navOf(view: TimeOffWeekView): TimeOffNav {
  const event = view.event;
  const eventWeek = event ? mondayOf(event.firstDay) : null;
  return {
    ...monthOf(view.week),
    weeks: weeksOfMonth(view.week).map((week) => ({
      week,
      label: weekLabel(week),
      pressed: week === view.week,
      event: holdsEvent(week, event),
    })),
    previousWeek: addDays(view.week, -7),
    nextWeek: addDays(view.week, 7),
    previousMonth: firstWeekOf(view.week, -1),
    nextMonth: firstWeekOf(view.week, 1),
    goTo:
      event && eventWeek && eventWeek !== view.week
        ? { label: `Go to ${event.label}`, week: eventWeek }
        : null,
  };
}

function failureOf(error: unknown): TimeOffState {
  if (!(error instanceof HttpErrorResponse) || error.status !== 404) return 'error';
  return (error.error as { code?: string } | null)?.code === 'feature_off' ? 'off' : 'not-found';
}

function tableOf(view: TimeOffWeekView): TimeOffTable {
  const members = view.members.length;
  return {
    week: view.week,
    label: weekLabel(view.week),
    days: daysOf(view.week).map((day, i) => {
      const weekend = i >= 5;
      const off = view.members.filter((member) => member.days[i] === 'Off').length;
      return {
        day,
        ...dayHeading(day),
        weekend,
        off: weekend ? null : offCount(off, members),
        many: !weekend && isMany(off, members),
        event:
          view.event && day >= view.event.firstDay && day <= view.event.lastDay
            ? view.event.label
            : null,
      };
    }),
    rows: view.members.map((member) => ({
      membershipId: member.membershipId,
      name: member.firstName,
      avatar: { ...member.avatar, accent: accentOf(member.avatar.accent) },
      isMe: member.isMe,
      days: member.days,
    })),
  };
}
