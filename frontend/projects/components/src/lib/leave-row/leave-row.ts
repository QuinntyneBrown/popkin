import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Leave row (docs/design-system/components/schedule.html): one weekday of "Add my time off",
 * its name beside its choice of Off, Tentative or Working.
 *
 * Slots: the default slot holds the day's `pk-segmented-control` (`kind="radio"`), labelled with
 * the same name.
 */
@Component({
  selector: 'div[pk-leave-row]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './leave-row.html',
  styleUrl: './leave-row.scss',
  host: { class: 'leave-row' },
})
export class LeaveRow {
  /** "Mon 15". */
  readonly day = input.required<string>();
}
