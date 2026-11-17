import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from '../avatar/avatar';
import { KeepPeriod, KeepStrip } from '../keep-strip/keep-strip';

/**
 * Habit row (docs/design-system/components/keep-strip.html, `habit-row`): a habit in the list:
 * who and how often, as one link to the person (at least 48 px tall); the keep strip; the streak
 * and the next one. Stacked below M; three columns from M. `pk-habit-list` rules each from the one above.
 */
@Component({
  selector: 'li[pk-habit-row]',
  imports: [Avatar, KeepStrip, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './habit-row.html',
  styleUrl: './habit-row.scss',
  host: { class: 'habit-row' },
})
export class HabitRow {
  /** "Sunday call with Mum". */
  readonly heading = input.required<string>();
  /** How often: "Every Sunday". */
  readonly often = input.required<string>();
  readonly link = input.required<string | readonly unknown[]>();
  /** The person's name, for their initials where there is no photo. */
  readonly name = input('');
  readonly photo = input<string | null>();
  readonly initials = input<string>();
  /** The `data-accent` of the person's colour. */
  readonly accent = input.required<string>();
  readonly periods = input.required<readonly KeepPeriod[]>();
  /** "11 weeks running". */
  readonly streak = input<string>();
  /** "Next Sun, Sep 20". */
  readonly next = input<string>();
}
