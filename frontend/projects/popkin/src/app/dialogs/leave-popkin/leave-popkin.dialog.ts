import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button, DialogFrame } from 'components';

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
  imports: [Button, DialogFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './leave-popkin.dialog.html',
})
export class LeavePopkinDialog {
  protected readonly data = inject<LeavePopkinData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected stay(): void {
    this.ref.close(false);
  }
}
