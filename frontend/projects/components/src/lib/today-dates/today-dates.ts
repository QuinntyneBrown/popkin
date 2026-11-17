import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from '../avatar/avatar';
import { StackAvatar } from '../avatar-stack/avatar-stack';
import { DateTile } from '../date-tile/date-tile';

/** One key date in Today's "Coming up". */
export interface TodayDateItem {
  /** The month over the day: "Sep", "26". */
  top: string;
  day: string;
  faces: readonly StackAvatar[];
  /** Whose it is, in words, for the faces: "Chidi". */
  who: string;
  /** "Chidi’s anniversary". */
  title: string;
  /** "5 years married"; none without a first year. */
  line?: string;
  /** "11 days". */
  days: string;
  link: string | readonly unknown[];
}

/**
 * Today's Coming up (docs/design-system/components/list-row.html): each date a row linking to
 * the profile, led by its bare date tile and the faces, with what it is and the days left
 * (L2-125 AC3).
 */
@Component({
  selector: 'ul[pk-today-dates]',
  imports: [Avatar, DateTile, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './today-dates.html',
  styleUrl: './today-dates.scss',
  host: { class: 'today-dates' },
})
export class TodayDates {
  readonly dates = input.required<readonly TodayDateItem[]>();
}
