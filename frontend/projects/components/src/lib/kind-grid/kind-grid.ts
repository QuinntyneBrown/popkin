import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
  viewChildren,
} from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/** One kind to choose, with its icon. */
export interface KindOption {
  value: string;
  label: string;
  icon: IconName;
}

/**
 * Kind grid (docs/design-system/components/form-sections.html, `kind-grid`): what kind of
 * milestone, one of a grid of choices. Only one can be chosen, so it is a radio group, as the
 * page recommends for the library: one tab stop, the arrow keys move the choice, as in
 * `pk-choice-chips`. The chosen kind is in sun with a dark edge. Options are 56 px tall, two
 * across, three from 640 px.
 */
@Component({
  selector: 'div[pk-kind-grid]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kind-grid.html',
  styleUrl: './kind-grid.scss',
})
export class KindGrid {
  /** The id the label's own is made from; a form summary links to the group by it. */
  readonly fieldId = input.required<string>();
  /** The visible label, the name of the group: "What kind". */
  readonly label = input.required<string>();
  readonly options = input.required<readonly KindOption[]>();
  readonly value = model.required<string>();

  protected readonly labelId = computed(() => `${this.fieldId()}-l`);
  /** With nothing chosen yet, the first option takes the tab stop. */
  protected readonly tabStop = computed(() =>
    this.options().some((option) => option.value === this.value())
      ? this.value()
      : this.options()[0]?.value,
  );

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('option');

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
    const options = this.options();
    const next = (index + step + options.length) % options.length;
    this.value.set(options[next].value);
    this.buttons()[next].nativeElement.focus();
  }
}
