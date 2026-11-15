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
 * Tag picker (docs/design-system/components/plan.html): the tag of a story, one of five, each a
 * chip with its tag's dot, as a radio group under its label (L2-069 AC1). The chosen chip is
 * outlined and says so with `aria-checked`; the dot's colour is never the only sign of the tag,
 * which its name gives. Tab enters on the chosen tag; the arrow keys move and choose.
 */
@Component({
  selector: 'div[pk-tag-picker]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tag-picker.html',
  styleUrl: './tag-picker.scss',
})
export class TagPicker {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input<readonly string[]>(['Travel', 'Stay', 'Food', 'Money', 'Fun']);
  readonly value = model.required<string>();
  readonly disabled = input(false);

  protected readonly labelId = computed(() => `${this.fieldId()}-l`);

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('option');

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
    this.value.set(options[next]);
    this.buttons()[next].nativeElement.focus();
  }
}
