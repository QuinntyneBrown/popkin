import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  ADMIN_ACCESS_API,
  ActionDialogState,
  AdminRole,
  AdminRow,
  REASON_MAX_LENGTH,
  changeRoleHeading,
  changeRoleSentence,
} from 'api';
import { Alert, Button, DialogFrame, Textarea } from 'components';

export interface ChangeAdminRoleData {
  admin: AdminRow;
  role: AdminRole;
}

/**
 * "Make Aiko Tanaka a Viewer?" (L2-119 AC5): what the new role means, with an optional reason
 * for the audit log (L2-087). It closes with the admin's new row.
 */
@Component({
  selector: 'pk-admin-change-role-dialog',
  imports: [Alert, Button, DialogFrame, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-change-role.dialog.html',
})
export class ChangeAdminRoleDialog {
  protected readonly data = inject<ChangeAdminRoleData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<AdminRow>>(DialogRef);
  private readonly api = inject(ADMIN_ACCESS_API);

  protected readonly state = new ActionDialogState('Optional');
  protected readonly reason = signal('');
  protected readonly maxLength = REASON_MAX_LENGTH;
  protected readonly heading = changeRoleHeading(this.data.admin.name, this.data.role);
  protected readonly description = changeRoleSentence(
    this.data.admin.name,
    this.data.admin.role,
    this.data.role,
  );
  protected readonly busy = computed(() => this.state.status() === 'busy');
  protected readonly lastOwner = computed(() => this.state.failure()?.code === 'last_owner');

  protected async confirm(): Promise<void> {
    this.ref.disableClose = true;
    const row = await this.state.confirm(this.reason(), (reason) =>
      this.api.changeRole(this.data.admin.id, this.data.role, reason),
    );
    this.ref.disableClose = false;
    if (row) this.ref.close(row);
  }

  protected cancel(): void {
    if (!this.busy()) this.ref.close();
  }
}
