import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SelectField, SelectOption } from '../select-field/select-field';

/** One kind's default lead time: "Birthdays", chosen "1 week before". */
export interface ReminderDefault {
  key: string;
  /** "Birthdays"; its select is named "Birthdays: remind me". */
  heading: string;
  value: string;
}

let nextId = 0;

/**
 * Reminder defaults (docs/design-system/components/info-card.html, the aside of Dates): the lead
 * time new dates of each kind start with (L2-139 AC1). How reminders reach me is the "Birthdays"
 * kind of Notifications (L2-140, as changed 17 November 2026).
 */
@Component({
  selector: 'aside[pk-reminder-defaults]',
  imports: [SelectField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reminder-defaults.html',
  styleUrl: './reminder-defaults.scss',
  host: { class: 'reminder-defaults', '[attr.aria-labelledby]': 'headingId' },
})
export class ReminderDefaults {
  protected readonly headingId = `reminder-defaults-${++nextId}`;
  readonly defaults = input.required<readonly ReminderDefault[]>();
  readonly options = input.required<readonly SelectOption[]>();
  /** A kind's default, changed. */
  readonly changed = output<{ key: string; value: string }>();
}
