import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Menu list (docs/design-system/components/list-row.html, `menu-list`): the rows of an action
 * sheet, one `pk-menu-item` each, inside a dialog's body. The settings of a Popkin, the actions
 * of an experience. A `separated` list follows the content of a screen, set off by a rule: the
 * account's Sign out and Delete my account.
 */
@Component({
  selector: 'div[pk-menu-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-list.html',
  styleUrl: './menu-list.scss',
  host: { class: 'menu-list', '[class.menu-list--separated]': 'separated()' },
})
export class MenuList {
  readonly separated = input(false);
}
