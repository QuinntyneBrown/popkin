import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Card (docs/design-system/components/card.html): a raised surface that groups one thing. On
 * `<a>` the whole card is a link (`card--link`): set `routerLink` on it. `centre` centres its
 * text, for a card that holds an empty state.
 *
 * With `icon` it is a row (`card--row`): the icon on a tile, its content and `text` as two lines,
 * and a chevron when it is a link, as Added's "Add a birthday, how you met…" (L2-180 AC2).
 */
@Component({
  selector: 'a[pk-card], div[pk-card]',
  imports: [Icon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card.html',
  styleUrl: './card.scss',
  host: {
    class: 'card',
    '[class.card--link]': 'isLink',
    '[class.card--center]': 'centre()',
    '[class.card--row]': 'icon()',
  },
})
export class Card {
  readonly centre = input(false);
  readonly icon = input<IconName>();
  readonly text = input<string>();

  protected readonly isLink =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'A';
}
