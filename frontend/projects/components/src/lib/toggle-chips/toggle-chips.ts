import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Chip } from '../chip/chip';
import { FieldLabel } from '../field-label/field-label';

/** A choice of a toggle chip: its emoji, when it has one, and its words. */
export interface ToggleChipOption {
  value: string;
  label: string;
  emoji?: string;
}

/**
 * Toggle chips (docs/design-system/components/chip.html, `chips` of `aria-pressed` outline
 * chips): any number chosen, under a label that names the group: the contact form's "Groups"
 * (L2-147 AC6). Each is a toggle button; the emoji is decoration.
 */
@Component({
  selector: 'div[pk-toggle-chips]',
  imports: [Chip, FieldLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toggle-chips.html',
  styleUrl: './toggle-chips.scss',
})
export class ToggleChips {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<readonly ToggleChipOption[]>();
  /** The values chosen. */
  readonly value = model<readonly string[]>([]);
  readonly disabled = input(false);

  protected pressed(value: string): boolean {
    return this.value().includes(value);
  }

  protected toggle(value: string): void {
    this.value.update((values) =>
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
    );
  }
}
