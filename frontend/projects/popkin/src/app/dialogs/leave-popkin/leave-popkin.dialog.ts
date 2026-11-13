import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { POPKINS_API } from 'api';
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

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  /** "Leave" is sent once; while it goes, it reads "Leaving…" (L2-056 AC3). */
  protected leave(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    this.api.leave(this.data.popkinId).subscribe({
      next: () => this.ref.close(true),
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }

  protected stay(): void {
    this.ref.close(false);
  }
}
