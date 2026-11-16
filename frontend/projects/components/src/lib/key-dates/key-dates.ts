import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/** One key date on a profile: "Birthday", "Jan 24", "1 week before". */
export interface KeyDateItem {
  icon: IconName;
  title: string;
  /** "Jan 24", or "Sat, Sep 26 · in 11 days" when near. */
  when: string;
  reminder: string;
}

/**
 * Key dates (docs/design-system/components/list-row.html, the short row): a contact's key dates
 * on their profile, each with its day and its reminder (L2-128 AC4).
 */
@Component({
  selector: 'ul[pk-key-dates]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './key-dates.html',
  styleUrl: './key-dates.scss',
  host: { class: 'divided' },
})
export class KeyDates {
  readonly dates = input.required<readonly KeyDateItem[]>();
}
