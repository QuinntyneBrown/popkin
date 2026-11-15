import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
  viewChildren,
} from '@angular/core';

/**
 * Points picker (docs/design-system/components/plan.html, `pts-group`): how big a story is, one
 * of 1, 2, 3, 5 and 8, as a radio group under its label and hint (L2-069 AC1). Tab enters on
 * the chosen size; the arrow keys move and choose (APG Radio Group).
 */
@Component({
  selector: 'div[pk-points-picker]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './points-picker.html',
  styleUrl: './points-picker.scss',
})
export class PointsPicker {
  /** The id the label's and hint's own are made from. */
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly options = input<readonly number[]>([1, 2, 3, 5, 8]);
  readonly value = model.required<number>();
  readonly disabled = input(false);

  protected readonly labelId = computed(() => `${this.fieldId()}-l`);
  protected readonly hintId = computed(() => `${this.fieldId()}-h`);

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('option');

  protected choose(value: number): void {
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
    this.value.set(options[next]);
    this.buttons()[next].nativeElement.focus();
  }
}
