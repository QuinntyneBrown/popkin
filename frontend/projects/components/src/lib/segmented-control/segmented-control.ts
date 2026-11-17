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
  /** A count after the label, in a quieter colour: "Admins 4". */
  count?: number;
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
    '[class.segmented--stretch]': 'stretch()',
    '[class.segmented--scroll]': 'scroll()',
  },
})
export class SegmentedControl {
  readonly label = input.required<string>();
  readonly kind = input<'tabs' | 'radio'>('tabs');
  readonly options = input.required<SegmentedOption[]>();
  readonly value = model.required<string>();
  /** Every option is disabled, as in a dialog that cannot be saved. */
  readonly disabled = input(false);
  /**
   * Why the choice is switched off for this person (L2-086 AC2, AC3): every option is
   * `aria-disabled` with the reason as its title, stays focusable and ignores a choice.
   */
  readonly disabledReason = input<string | null>(null);
  /** Below 768 px the options share the full width, as a feature's modes do. */
  readonly stretch = input(false);
  /** Page tabs: the options keep their width and the row scrolls when it is wider than the page. */
  readonly scroll = input(false);
  /** Gives each option the id `{idPrefix}-{value}`, for a tab panel to be labelled by. */
  readonly idPrefix = input<string>();

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('option');

  protected choose(value: string): void {
    if (this.disabledReason()) return;
    this.value.set(value);
  }

  protected move(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const options = this.options();
    const next = (index + step + options.length) % options.length;
    if (!this.disabledReason()) this.value.set(options[next].value);
    this.buttons()[next].nativeElement.focus();
  }
}
