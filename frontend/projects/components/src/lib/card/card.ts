import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';

/**
 * Card (docs/design-system/components/card.html): a raised surface that groups one thing. On
 * `<a>` the whole card is a link (`card--link`): set `routerLink` on it. `centre` centres its
 * text, for a card that holds an empty state.
 */
@Component({
  selector: 'a[pk-card], div[pk-card]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card.html',
  styleUrl: './card.scss',
  host: {
    class: 'card',
    '[class.card--link]': 'isLink',
    '[class.card--center]': 'centre()',
  },
})
export class Card {
  readonly centre = input(false);

  protected readonly isLink =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'A';
}
