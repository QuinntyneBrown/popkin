import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { SelectField, SelectOption } from '../select-field/select-field';
import { Switch } from '../switch/switch';

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
 * time new dates of each kind start with (L2-139 AC1), then how reminders reach me, phone and
 * Monday email, each a switch (L2-140).
 */
@Component({
  selector: 'aside[pk-reminder-defaults]',
  imports: [Icon, SelectField, Switch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reminder-defaults.html',
  styleUrl: './reminder-defaults.scss',
  host: { class: 'reminder-defaults', '[attr.aria-labelledby]': 'headingId' },
})
export class ReminderDefaults {
  protected readonly headingId = `reminder-defaults-${++nextId}`;
  readonly defaults = input.required<readonly ReminderDefault[]>();
  readonly options = input.required<readonly SelectOption[]>();
  readonly phone = model(true);
  readonly email = model(true);
  /** A kind's default, changed. */
  readonly changed = output<{ key: string; value: string }>();
}
