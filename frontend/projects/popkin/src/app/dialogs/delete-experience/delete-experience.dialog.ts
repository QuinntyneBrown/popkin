import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { EXPERIENCES_API } from 'api';
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

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected delete(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    this.api.remove(this.data.popkinId, this.data.experienceId).subscribe({
      next: () => this.ref.close(true),
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }

  protected keep(): void {
    this.ref.close(false);
  }
}
