import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminDrawer, AdminNav, AdminNavMe, AdminNavSection } from 'components';

export interface MenuData {
  sections: readonly AdminNavSection[];
  current?: string;
  me: AdminNavMe | null;
  label: string;
}

/**
 * The menu below 1024 px (L2-089 AC2): every section in a drawer. A chosen section, "Close
 * menu", the backdrop or Escape closes it; it closes with `'signOut'` when the admin signs out.
 */
@Component({
  selector: 'pk-menu-dialog',
  imports: [AdminDrawer, AdminNav],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu.dialog.html',
})
export class MenuDialog {
  protected readonly data = inject<MenuData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<'signOut'>>(DialogRef);
}
