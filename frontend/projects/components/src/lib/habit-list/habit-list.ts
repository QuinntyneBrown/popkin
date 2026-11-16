import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HabitRow } from '../habit-row/habit-row';
import { KeepPeriod } from '../keep-strip/keep-strip';

/** One habit as its row shows it. */
export interface HabitListItem {
  id: string;
  /** "Sunday call with Ada". */
  heading: string;
  /** "Weekly". */
  often: string;
  link: string | readonly unknown[];
  name: string;
  photo: string | null;
  initials: string;
  accent: string;
  periods: readonly KeepPeriod[];
  /** "10 weeks running". */
  streak?: string;
  /** "Next Sun, Sep 20". */
  next?: string;
}

/**
 * Habit list (docs/design-system/components/keep-strip.html, `divided` of `habit-row`): Habits'
 * rows under the habit that leads, each ruled from the one above.
 */
@Component({
  selector: 'ul[pk-habit-list]',
  imports: [HabitRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './habit-list.html',
  styleUrl: './habit-list.scss',
  host: { class: 'divided' },
})
export class HabitList {
  readonly habits = input.required<readonly HabitListItem[]>();
}
