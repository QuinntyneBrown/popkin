import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogFrame, MenuItem, MenuList } from 'components';

export interface ContactActionsData {
  accent: string;
  /** The contact's full name names the menu. */
  name: string;
  firstName: string;
  /** The first item: into Closest or out of it, with its hint (L2-131 AC1, AC4). */
  closest: { label: string; hint: string };
}

export type ContactAction = 'closest' | 'edit' | 'connections';

/**
 * "More for {first name}" (L2-131): Closest, Edit profile and the contact's connections. It
 * closes with the one chosen; the profile acts on it.
 */
@Component({
  selector: 'pk-contact-actions-dialog',
  imports: [DialogFrame, MenuItem, MenuList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-actions.dialog.html',
})
export class ContactActionsDialog {
  protected readonly data = inject<ContactActionsData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<ContactAction>>(DialogRef);

  protected choose(action: ContactAction): void {
    this.ref.close(action);
  }
}
