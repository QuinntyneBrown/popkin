import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Menu item (docs/design-system/components/list-row.html, `menu-list__item`): one row of a
 * `pk-menu-list`. An icon on a tile and the row's words, which are its content and its name;
 * a `hint` is a second, quieter line under them. A link when it goes somewhere, a button when
 * it acts where it is.
 *
 * A `danger` row is destructive: its words are coral, and they say what it does ("Delete"), so
 * the colour is never the only carrier.
 */
@Component({
  selector: 'a[pk-menu-item], button[pk-menu-item]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-item.html',
  styleUrl: './menu-item.scss',
  host: {
    class: 'menu-list__item',
    '[class.menu-list__item--danger]': 'danger()',
  },
})
export class MenuItem {
  readonly icon = input.required<IconName>();
  /** A destructive row: "Delete", "Leave this Popkin". */
  readonly danger = input(false);
  /** A second line under the words: "Name, emoji and colour". */
  readonly hint = input<string>();
}
