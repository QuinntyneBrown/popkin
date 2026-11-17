import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Icon } from '../icon/icon';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Select field (docs/design-system/components/select.html): a native select. `toolbar` is the
 * pill of a toolbar, whose label is visually hidden: its first option says what it chooses ("All
 * admins"). `row` is the small pill at the end of a setting list's row ("When to remind you
 * about Grace Adeyemi"), its label visually hidden too. `value` is two-way. An error is said under
 * it and marks it `aria-invalid`, as a text field's is. `disabled` greys it while what it sets is
 * off.
 */
@Component({
  selector: 'div[pk-select-field]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './select-field.html',
  styleUrl: './select-field.scss',
  host: {
    class: 'select-field',
    '[class.select-field--toolbar]': "variant() === 'toolbar'",
    '[class.select-field--row]': "variant() === 'row'",
  },
})
export class SelectField {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectOption[]>();
  readonly variant = input<'default' | 'toolbar' | 'row'>('default');
  /** The label is for assistive technology only, where the row around it says what it is. */
  readonly hideLabel = input(false);
  readonly error = input<string>();
  readonly disabled = input(false);
  readonly value = model('');

  protected chose(event: Event): void {
    this.value.set((event.target as HTMLSelectElement).value);
  }
}
