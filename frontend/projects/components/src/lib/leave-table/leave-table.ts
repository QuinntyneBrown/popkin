import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar, PersonAvatar } from '../avatar/avatar';

/** A day's column: its heading and the count under it. */
export interface LeaveDay {
  /** "Mon". */
  weekday: string;
  /** "15". */
  date: string;
  weekend: boolean;
  /** "5 of 6 off"; null on a weekend, which shows a dash. */
  off: string | null;
  /** The count stands out: every member but at most one is off. */
  many: boolean;
  /** The event's label over one of its days; null on any other day. */
  event: string | null;
}

/** What a member's day is: the words in the cell say it, the fill only repeats it. */
export type LeaveStatus = 'Off' | 'Tentative' | 'Working' | 'Weekend';

export interface LeaveRow {
  name: string;
  avatar: PersonAvatar;
  /** Monday to Sunday. */
  days: LeaveStatus[];
}

/**
 * Leave table (docs/design-system/components/leave-table.html): a week of a group's time off, a
 * row per member and a column per day (L2-072 AC2). Each weekday cell says Off, Tentative or
 * Working; a weekend cell is named "Weekend". The event's days are tinted and headed with its
 * label. Below 640 px the table scrolls sideways inside its wrap with the member column fixed,
 * and the page does not (L2-072 AC9).
 */
@Component({
  selector: 'div[pk-leave-table]',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './leave-table.html',
  styleUrl: './leave-table.scss',
  host: { class: 'table-wrap' },
})
export class LeaveTable {
  /** "Feb 15 – 21": the corner of the table and its caption. */
  readonly label = input.required<string>();
  readonly days = input.required<LeaveDay[]>();
  readonly rows = input.required<LeaveRow[]>();

  protected readonly columns = [0, 1, 2, 3, 4, 5, 6, 7];
}
