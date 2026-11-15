import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Add card (docs/design-system/components/info-card.html, `add-card`): the dashed card that
 * starts what is missing, its words naming what it starts and for whom: "Make a habit of seeing
 * Femi". On `<a>` it goes to a screen (set `routerLink`); on `<button>` it opens a dialog in
 * place. At least 44 px tall; the icon is hidden.
 */
@Component({
  selector: 'a[pk-add-card], button[pk-add-card]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-card.html',
  styleUrl: './add-card.scss',
  host: { class: 'add-card' },
})
export class AddCard {
  readonly icon = input<IconName>('plus');
}
