import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Select field (docs/design-system/components/select.html): a native select. `toolbar` is the
 * pill of a toolbar, whose label is visually hidden: its first option says what it chooses ("All
 * admins"). `value` is two-way.
 */
@Component({
  selector: 'div[pk-select-field]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './select-field.html',
  styleUrl: './select-field.scss',
  host: { class: 'select-field', '[class.select-field--toolbar]': "variant() === 'toolbar'" },
})
export class SelectField {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectOption[]>();
  readonly variant = input<'default' | 'toolbar'>('default');
  /** The label is for assistive technology only, where the row around it says what it is. */
  readonly hideLabel = input(false);
  readonly value = model('');

  protected chose(event: Event): void {
    this.value.set((event.target as HTMLSelectElement).value);
  }
}
