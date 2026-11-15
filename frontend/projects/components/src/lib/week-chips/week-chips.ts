import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconButton } from '../icon-button/icon-button';

/** A week of the month: its words, its Monday, whether it is chosen and holds the event. */
export interface WeekChipLink {
  week: string;
  /** "Feb 15 – 21". */
  label: string;
  pressed: boolean;
  /** A dot named "Event this week" (L2-072 AC3). */
  event: boolean;
}

/**
 * Week chips (docs/design-system/components/schedule.html#weeks): the weeks of a month between
 * "Previous week" and "Next week". Each is a link that sets `?week=` on `link`; the chosen one is
 * pressed, and the week that holds the event carries a dot in the Popkin's colour. The row
 * scrolls sideways when it does not fit.
 */
@Component({
  selector: 'div[pk-week-chips]',
  imports: [IconButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './week-chips.html',
  styleUrl: './week-chips.scss',
  host: { class: 'weeks' },
})
export class WeekChips {
  readonly link = input.required<string>();
  readonly weeks = input.required<WeekChipLink[]>();
  /** The week before and after the chosen one, as `YYYY-MM-DD`. */
  readonly previous = input.required<string>();
  readonly next = input.required<string>();
}
