import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { IconButton } from '../icon-button/icon-button';
import { SelectField, SelectOption } from '../select-field/select-field';

/**
 * Date entry (docs/design-system/components/form-sections.html, `date-entry`): a date with its
 * reminder in a form: what and when, how far ahead to hear (a select whose hidden label names
 * the date, "Remind me about the birthday") and Remove, which names what it removes ("Remove
 * the birthday"). On one line from 640 px.
 */
@Component({
  selector: 'div[pk-date-entry]',
  imports: [IconButton, SelectField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-entry.html',
  styleUrl: './date-entry.scss',
  host: { class: 'date-entry' },
})
export class DateEntry {
  /** The id of the reminder's select. */
  readonly fieldId = input.required<string>();
  /** What the date is: "Birthday". */
  readonly kind = input.required<string>();
  /** When: "9 March". */
  readonly date = input.required<string>();
  /** How far ahead to hear: "On the day", "1 week before" … */
  readonly options = input.required<readonly SelectOption[]>();
  readonly remind = model('');

  readonly removed = output<void>();

  protected readonly remindLabel = computed(
    () => `Remind me about the ${this.kind().toLowerCase()}`,
  );
  protected readonly removeLabel = computed(() => `Remove the ${this.kind().toLowerCase()}`);
}
