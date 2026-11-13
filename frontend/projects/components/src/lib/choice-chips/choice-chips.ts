import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
  viewChildren,
} from '@angular/core';
import { Chip } from '../chip/chip';

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Choice chips (docs/design-system/components/chip.html): one choice out of a few, as a radio
 * group of chips under a label, such as the kind of an experience. Tab enters on the chosen
 * chip; the arrow keys move and choose (APG Radio Group). The chosen chip is the dark one and
 * says so with `aria-checked`.
 *
 * While `disabled` a choice is ignored and the group says it is disabled; the chips keep their
 * look, as a form that is being saved does.
 */
@Component({
  selector: 'div[pk-choice-chips]',
  imports: [Chip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './choice-chips.html',
  styleUrl: './choice-chips.scss',
})
export class ChoiceChips {
  /** The id the label's own is made from; a form summary links to the group by it. */
  readonly fieldId = input.required<string>();
  /** The visible label, the name of the group: "Kind". */
  readonly label = input.required<string>();
  readonly options = input.required<readonly ChipOption[]>();
  readonly value = model.required<string>();
  readonly disabled = input(false);

  protected readonly labelId = computed(() => `${this.fieldId()}-l`);

  private readonly chips = viewChildren<unknown, ElementRef<HTMLButtonElement>>('chip', {
    read: ElementRef,
  });

  protected choose(value: string): void {
    if (!this.disabled()) this.value.set(value);
  }

  protected move(event: KeyboardEvent, index: number): void {
    const keys: Record<string, number> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
    };
    const step = keys[event.key];
    if (!step) return;
    event.preventDefault();
    if (this.disabled()) return;
    const options = this.options();
    const next = (index + step + options.length) % options.length;
    this.value.set(options[next].value);
    this.chips()[next].nativeElement.focus();
  }
}
