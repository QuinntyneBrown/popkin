import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmDialogState, PLAN_API } from 'api';
import { Alert, Button, DialogFrame } from 'components';

/**
 * Opened over the Story dialog, so it is named and described by ids of its own; passed to
 * `dialogConfig`, which keeps it modal with no CDK backdrop.
 */
export const DELETE_STORY = {
  ariaLabelledBy: 'delete-story-title',
  ariaDescribedBy: 'delete-story-desc',
} as const;

export interface DeleteStoryData {
  popkinId: string;
  storyId: string;
  accent: string;
}

/**
 * "Delete this story?" (L2-070 AC4): the question before a story goes from the board for
 * everyone. Busy while it deletes; a failure keeps it open and says so. It closes with true once
 * the story is gone.
 */
@Component({
  selector: 'pk-delete-story-dialog',
  imports: [Alert, Button, DialogFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-story.dialog.html',
})
export class DeleteStoryDialog {
  protected readonly data = inject<DeleteStoryData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(PLAN_API);

  private readonly state = new ConfirmDialogState(this.ref);
  protected readonly busy = this.state.busy;
  protected readonly failed = this.state.failed;

  protected async delete(): Promise<void> {
    const sent = await this.state.send(() =>
      this.api.deleteStory(this.data.popkinId, this.data.storyId),
    );
    if (sent) this.ref.close(true);
  }

  protected keep(): void {
    this.ref.close(false);
  }
}
