import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  viewChildren,
} from '@angular/core';

export interface ChoiceOption<T extends string = string> {
  value: T;
  icon: string;
  title: string;
  sub: string;
}

/**
 * Choice cards (docs/design-system/components/choice-card.html): one radio group of option cards.
 * Tab enters on the chosen card; the arrow keys move and choose (APG Radio Group, L2-009 AC7).
 * The chosen card is ringed and its radio dotted, not only tinted.
 */
@Component({
  selector: 'div[pk-choice-card]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './choice-card.html',
  styleUrl: './choice-card.scss',
  host: { role: 'radiogroup', '[attr.aria-label]': 'label()' },
})
export class ChoiceCard {
  readonly label = input.required<string>();
  readonly options = input.required<readonly ChoiceOption[]>();
  readonly value = model.required<string>();

  private readonly cards = viewChildren<ElementRef<HTMLButtonElement>>('card');

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
    this.cards()[next].nativeElement.focus();
  }
}
