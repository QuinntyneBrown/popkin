import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  viewChildren,
} from '@angular/core';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Segmented control (docs/design-system/components/segmented-control.html). As `tabs` it switches
 * the field below (APG Tabs); as `radio` it is a setting, such as the theme (APG Radio group).
 * Either way Tab moves onto the chosen option, and the arrow keys move and select.
 */
@Component({
  selector: 'div[pk-segmented-control]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.scss',
  host: {
    class: 'segmented',
    '[attr.role]': "kind() === 'radio' ? 'radiogroup' : 'tablist'",
    '[attr.aria-label]': 'label()',
  },
})
export class SegmentedControl {
  readonly label = input.required<string>();
  readonly kind = input<'tabs' | 'radio'>('tabs');
  readonly options = input.required<SegmentedOption[]>();
  readonly value = model.required<string>();

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('option');

  protected choose(value: string): void {
    this.value.set(value);
  }

  protected move(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const options = this.options();
    const next = (index + step + options.length) % options.length;
    this.value.set(options[next].value);
    this.buttons()[next].nativeElement.focus();
  }
}
