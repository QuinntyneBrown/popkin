import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmDialogState, EXPERIENCES_API } from 'api';
import { Alert, Button, DialogFrame } from 'components';

export interface DeleteExperienceData {
  popkinId: string;
  experienceId: string;
  accent: string;
}

/**
 * "Delete this experience?" (L2-040 AC6): the question before an experience goes, with its
 * ratings and comments. It closes with true once it is deleted.
 */
@Component({
  selector: 'pk-delete-experience-dialog',
  imports: [Alert, Button, DialogFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-experience.dialog.html',
})
export class DeleteExperienceDialog {
  protected readonly data = inject<DeleteExperienceData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(EXPERIENCES_API);

  private readonly state = new ConfirmDialogState(this.ref);
  protected readonly busy = this.state.busy;
  protected readonly failed = this.state.failed;

  protected async delete(): Promise<void> {
    const sent = await this.state.send(() =>
      this.api.remove(this.data.popkinId, this.data.experienceId),
    );
    if (sent) this.ref.close(true);
  }

  protected keep(): void {
    this.ref.close(false);
  }
}
