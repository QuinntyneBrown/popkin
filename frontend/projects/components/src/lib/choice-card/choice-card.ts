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
  /** An emoji before the text; without one the radio comes first, as the admin roles have. */
  icon?: string;
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
  host: {
    role: 'radiogroup',
    '[attr.aria-label]': 'showLabel() ? null : label()',
    '[attr.aria-labelledby]': 'showLabel() ? labelId() : null',
    '[class.option-grid]': 'grid()',
  },
})
export class ChoiceCard {
  readonly label = input.required<string>();
  readonly options = input.required<readonly ChoiceOption[]>();
  /** Whether the label shows above the cards, as a field's does: "Role". */
  readonly showLabel = input(false);
  readonly labelId = input('choice-label');
  readonly value = model.required<string>();
  /**
   * The cards side by side in a row of three from 640 px, one above another below, each title
   * at its full size: how often activity email comes (L2-155 AC4).
   */
  readonly grid = input(false);
  /** Every card dimmed and not chosen: the choice does not apply as things stand (L2-156 AC3). */
  readonly disabled = input(false);

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
