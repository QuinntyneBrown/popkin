import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  ADMIN_ACCESS_API,
  ActionDialogState,
  AdminRow,
  REASON_MAX_LENGTH,
  removeSentence,
} from 'api';
import { Alert, Button, DialogFrame, Textarea } from 'components';
import { map } from 'rxjs';

/**
 * "Remove Marco Bianchi?" (L2-119 AC6): they are signed out at once and their past actions stay,
 * with an optional reason for the audit log (L2-087). It closes with true once they are removed.
 */
@Component({
  selector: 'pk-admin-remove-dialog',
  imports: [Alert, Button, DialogFrame, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-remove.dialog.html',
})
export class RemoveAdminDialog {
  protected readonly admin = inject<AdminRow>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(ADMIN_ACCESS_API);

  protected readonly state = new ActionDialogState('Optional', this.ref);
  protected readonly reason = signal('');
  protected readonly maxLength = REASON_MAX_LENGTH;
  protected readonly description = removeSentence(this.admin.role);
  protected readonly busy = this.state.busy;
  protected readonly lastOwner = computed(() => this.state.failure()?.code === 'last_owner');

  protected async confirm(): Promise<void> {
    const removed = await this.state.confirm(this.reason(), (reason) =>
      this.api.removeAdmin(this.admin.id, reason).pipe(map(() => true)),
    );
    if (removed) this.ref.close(true);
  }

  protected cancel(): void {
    if (!this.busy()) this.ref.close(false);
  }
}
