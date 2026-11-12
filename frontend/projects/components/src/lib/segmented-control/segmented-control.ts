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
 * Segmented control (docs/design-system/components/segmented-control.html), as tabs that switch
 * the field below (APG Tabs): Tab moves onto the chosen option, the arrow keys move and select.
 */
@Component({
  selector: 'div[pk-segmented-control]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.scss',
  host: {
    class: 'segmented',
    role: 'tablist',
    '[attr.aria-label]': 'label()',
  },
})
export class SegmentedControl {
  readonly label = input.required<string>();
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
