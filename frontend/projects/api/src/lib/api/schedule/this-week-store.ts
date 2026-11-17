import { HttpErrorResponse } from '@angular/common/http';
import { switchedOffBy } from '../popkins/feature-text';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, filter, interval, merge } from 'rxjs';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { accentOf } from '../../models/popkin';
import { EveningView, ThisWeekView } from '../../models/this-week';
import { HoursDay } from './my-hours';
import { dateOf, weekLabel } from './schedule-weeks';
import { SCHEDULE_API } from './schedule-api';
import {
  ShiftBlock,
  actionOf,
  blocksOf,
  draftOf,
  freeLabel,
  headlineOf,
  legendOf,
  sentenceOf,
  subtitleOf,
  tintAt,
  timelineText,
} from './this-week-text';
import { LONG_WEEKDAYS as longDays, SHORT_WEEKDAYS as shortDays } from '../text/calendar';

/** A day button: "Wed", "16", "6/6 free". */
export interface ThisWeekDay {
  day: string;
  weekday: string;
  date: string;
  free: string;
  all: boolean;
  pressed: boolean;
}

/** The timeline of the chosen day, as `pk-shifts` draws it. */
export interface ThisWeekShifts {
  label: string;
  text: string;
  rows: {
    name: string;
    avatar: { initials: string; accent: string; photoUrl: string | null };
    blocks: ShiftBlock[];
  }[];
  tint: number | null;
  legend: { label: string; swatch: 'card' | 'tint'; emphasis?: string }[];
}

/** The chosen evening: its headline, the sentence under it, the chat action and the timeline. */
export interface ThisWeekChosen {
  /** Nobody has entered hours in the seven days (L2-074 AC9). */
  empty: boolean;
  headline: { text: string; time: string | null };
  sub: string;
  action: { label: string; variant: 'popkin' | 'secondary' };
  /** The message the Everyone thread opens with (L2-074 AC7). */
  draft: string;
  shifts: ThisWeekShifts;
}

/** My hours for the seven days, as "My hours" opens on them (L2-074 AC8). */
export interface MyHours {
  membershipId: string;
  from: string;
  /** "Sep 12 – 18". */
  label: string;
  days: HoursDay[];
}

export type ThisWeekState = 'loading' | 'ready' | 'error' | 'off' | 'not-found';

/** This week of one Popkin, seven days from the viewer's today (docs/detailed-designs/schedules/this-week). One per screen. */
@Injectable()
export class ThisWeekStore {
  private readonly api = inject(SCHEDULE_API);
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.follow();
  }

  private popkinId = '';
  private today = '';
  private reading?: Subscription;
  private minute?: Subscription;
  private readonly view = signal<ThisWeekView | null>(null);
  private readonly day = signal<string | undefined>(undefined);

  readonly state = signal<ThisWeekState>('loading');
  /** Who switched the feature off while `state` is `off` (L2-077 AC2). */
  readonly offBy = signal<'Host' | 'Popkin'>('Popkin');
  readonly canEdit = computed(() => this.view()?.canEdit ?? false);
  readonly subtitle = computed(() => {
    const view = this.view();
    return view ? subtitleOf(view.from) : '';
  });

  /** The day chosen: the one in the address when it is one of the seven, else today. */
  private readonly index = computed(() => {
    const view = this.view();
    const day = this.day();
    const index = view && day ? view.days.findIndex((evening) => evening.date === day) : -1;
    return Math.max(index, 0);
  });

  readonly days = computed<ThisWeekDay[]>(() => {
    const view = this.view();
    if (!view) return [];
    return view.days.map((evening, i) => {
      const date = dateOf(evening.date);
      return {
        day: evening.date,
        weekday: shortDays[date.getDay()],
        date: String(date.getDate()),
        free: freeLabel(evening.freeCount, view.memberCount),
        all: evening.freeCount === view.memberCount,
        pressed: i === this.index(),
      };
    });
  });

  readonly chosen = computed(() => {
    const view = this.view();
    return view ? chosenOf(view, this.index()) : null;
  });

  /** My hours, while the Popkin can be changed; null otherwise. */
  readonly mine = computed<MyHours | null>(() => {
    const view = this.view();
    const me = view?.canEdit ? view.members.find((member) => member.isMe) : undefined;
    if (!view || !me) return null;
    return {
      membershipId: me.membershipId,
      from: view.from,
      label: weekLabel(view.from),
      days: view.days.map((evening, i) => {
        const date = dateOf(evening.date);
        const stretches = me.days[i].map((stretch) => ({
          start: stretch.start,
          // A time field cannot hold 24:00: midnight at the end is 00:00.
          end: stretch.end === '24:00' ? '00:00' : stretch.end,
        }));
        return {
          name: `${shortDays[date.getDay()]} ${date.getDate()}`,
          weekday: longDays[date.getDay()],
          stretches: stretches.length ? stretches : [{ start: '', end: '' }],
        };
      }),
    };
  });

  /** Shows this week as a save answered it. */
  saved(view: ThisWeekView): void {
    this.view.set(view);
    this.state.set('ready');
  }

  /** Opens this week from `today`, the viewer's, on `day`; another day of it reads nothing. */
  open(popkinId: string, day: string | undefined, today: string): void {
    this.day.set(day);
    if (popkinId === this.popkinId && today === this.today && this.view()) return;
    if (popkinId !== this.popkinId) this.view.set(null);
    this.popkinId = popkinId;
    this.today = today;
    this.realtime.start();
    // L2-077 AC4: an open view reads itself each minute, so it follows the switch within one.
    this.minute ??= interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.read());
    this.read();
  }

  retry(): void {
    this.view.set(null);
    this.read();
  }

  /**
   * The open view reads itself again, quietly, when its Popkin's schedule changes, when a member
   * leaves it, and when the connection comes back (L2-072 AC11, the shared real-time rules).
   */
  private follow(): void {
    const mine = takeUntilDestroyed(this.destroyRef);
    merge(
      this.realtime.scheduleChanged$.pipe(filter((popkinId) => popkinId === this.popkinId)),
      this.realtime.memberLeft$.pipe(filter((left) => left.popkinId === this.popkinId)),
      this.realtime.reconnected$,
    )
      .pipe(
        filter(() => !!this.popkinId),
        mine,
      )
      .subscribe(() => this.read());
  }

  private read(): void {
    this.reading?.unsubscribe();
    if (!this.view()) this.state.set('loading');
    this.reading = this.api.thisWeek(this.popkinId, this.today).subscribe({
      next: (view) => {
        this.view.set(view);
        this.state.set('ready');
      },
      error: (error: unknown) => this.failed(error),
    });
  }

  private failed(error: unknown): void {
    this.offBy.set(switchedOffBy(error));
    this.state.set(failureOf(error));
  }
}

function chosenOf(view: ThisWeekView, index: number): ThisWeekChosen {
  const evening = view.days[index];
  const weekday = longDays[dateOf(evening.date).getDay()];
  const members = view.memberCount;
  const empty = view.members.every((member) => member.days.every((day) => day.length === 0));
  const everyone = view.days.filter((day) => day.everyoneFreeFrom !== null);
  const legend = legendOf(evening, members);
  const shifts: ThisWeekShifts = {
    label: `Who is working on ${weekday}`,
    text: timelineText(
      view.members.map((member) => ({ name: member.firstName, stretches: member.days[index] })),
    ),
    rows: view.members.map((member) => ({
      name: member.firstName,
      avatar: { ...member.avatar, accent: accentOf(member.avatar.accent) },
      blocks: blocksOf(member.days[index]),
    })),
    tint: evening.everyoneFreeFrom ? tintAt(evening.everyoneFreeFrom) : null,
    legend: [
      { label: 'At work', swatch: 'card' },
      ...(legend.allFree && legend.time
        ? [{ label: legend.allFree, swatch: 'tint' as const, emphasis: legend.time }]
        : []),
    ],
  };
  if (empty) {
    return {
      empty,
      headline: { text: 'Nobody has added their hours yet.', time: null },
      sub: 'Each of you adds your own working hours; this week finds the evening everyone is free. Add yours to get it started.',
      action: actionOf(evening),
      draft: draftOf(weekday, evening, freeNames(view, evening)),
      shifts,
    };
  }
  return {
    empty,
    headline: headlineOf(weekday, evening, members),
    sub: sentenceOf(
      evening,
      members,
      everyone.length,
      everyone.length === 1 ? longDays[dateOf(everyone[0].date).getDay()] : undefined,
    ),
    action: actionOf(evening),
    draft: draftOf(weekday, evening, freeNames(view, evening)),
    shifts,
  };
}

/** The first names of those free on the evening: every member but those working. */
function freeNames(view: ThisWeekView, evening: EveningView): string[] {
  const working = [...evening.working];
  return view.members
    .map((member) => member.firstName)
    .filter((name) => {
      const at = working.indexOf(name);
      if (at < 0) return true;
      working.splice(at, 1);
      return false;
    });
}

function failureOf(error: unknown): ThisWeekState {
  if (!(error instanceof HttpErrorResponse) || error.status !== 404) return 'error';
  return (error.error as { code?: string } | null)?.code === 'feature_off' ? 'off' : 'not-found';
}
