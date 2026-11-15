import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The body of the Schedule tab, inside a `flush` body of the app screen: room at the sides and
 * at its end for the tabs.
 *
 * While `loading` it draws its own skeleton, with a status line for assistive technology
 * (L2-056 AC1).
 *
 * Slot: the default slot holds the view: the month, the weeks, the table and its legend of time
 * off, or the days, the headline and the timeline of this week.
 */
@Component({
  selector: 'div[pk-schedule]',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss',
  host: { class: 'schedule' },
})
export class Schedule {
  readonly loading = input(false);
  /** What the status line says while it loads. */
  readonly loadingText = input('Loading time off…');
  /** The view whose skeleton it draws: the table of time off, or the days of this week. */
  readonly view = input<'time-off' | 'this-week'>('time-off');
}
