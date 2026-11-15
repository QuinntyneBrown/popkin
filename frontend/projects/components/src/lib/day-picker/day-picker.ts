import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One day button: "Wed", "16", "6/6 free". */
export interface DayPick {
  /** `YYYY-MM-DD`, put in the address as `?day=`. */
  day: string;
  weekday: string;
  date: string;
  /** "4/6 free". */
  free: string;
  /** Everyone is free: the count is in the Popkin's colour. */
  all: boolean;
  pressed: boolean;
}

/**
 * Day picker (docs/design-system/components/schedule.html): the seven days of this week as
 * links, the chosen one pressed, each with how many are free that evening, and the line that
 * says what free means.
 */
@Component({
  selector: 'div[pk-day-picker]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './day-picker.html',
  styleUrl: './day-picker.scss',
})
export class DayPicker {
  /** The screen the days link to; each adds its `?day=`. */
  readonly link = input.required<string>();
  readonly days = input.required<DayPick[]>();
  /** "Free means not working between 8 and 11 pm." */
  readonly note = input.required<string>();
}
