import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Chip } from '../chip/chip';

export interface FilterChipOption<T extends string = string> {
  value: T;
  label: string;
  /** How many the filter would show: "Family 4". */
  count?: number;
}

/**
 * Filter chips (docs/design-system/components/chip.html): pressed buttons in a named group that
 * narrow a list in place, each with its count, such as the circles on People. The pressed chip
 * is the ink one and says so with `aria-pressed`; Tab moves from chip to chip and Space or Enter
 * presses. Choosing one of a few in a form is `pk-choice-chips`, a radio group.
 */
@Component({
  selector: 'div[pk-filter-chips]',
  imports: [Chip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-chips.html',
  styleUrl: './filter-chips.scss',
  host: { class: 'chips', role: 'group', '[attr.aria-label]': 'label()' },
})
export class FilterChips {
  /** The group's name for assistive technology: "Circle". */
  readonly label = input.required<string>();
  readonly options = input.required<readonly FilterChipOption[]>();
  readonly value = model.required<string>();
}
