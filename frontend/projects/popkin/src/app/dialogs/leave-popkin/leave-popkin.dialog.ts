import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmDialogState, POPKINS_API } from 'api';
import { Alert, Button, DialogFrame } from 'components';

export interface LeavePopkinData {
  popkinId: string;
  /** The Popkin's name names the dialog. */
  name: string;
  accent: string;
}

/**
 * "Leave Lakeside Weekend?" (L2-047 AC1): what stays when a member leaves and how they come
 * back. It closes with true once they have left.
 */
@Component({
  selector: 'pk-leave-popkin-dialog',
  imports: [Alert, Button, DialogFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './leave-popkin.dialog.html',
})
export class LeavePopkinDialog {
  protected readonly data = inject<LeavePopkinData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(POPKINS_API);

  private readonly state = new ConfirmDialogState(this.ref);
  protected readonly busy = this.state.busy;
  protected readonly failed = this.state.failed;

  /** "Leave" is sent once; while it goes, it reads "Leaving…" (L2-056 AC3). */
  protected async leave(): Promise<void> {
    if (await this.state.send(() => this.api.leave(this.data.popkinId))) this.ref.close(true);
  }

  protected stay(): void {
    this.ref.close(false);
  }
}
