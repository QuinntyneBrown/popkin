import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Menu list (docs/design-system/components/list-row.html, `menu-list`): the rows of an action
 * sheet, one `pk-menu-item` each, inside a dialog's body. The settings of a Popkin, the actions
 * of an experience.
 */
@Component({
  selector: 'div[pk-menu-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-list.html',
  styleUrl: './menu-list.scss',
  host: { class: 'menu-list' },
})
export class MenuList {}
