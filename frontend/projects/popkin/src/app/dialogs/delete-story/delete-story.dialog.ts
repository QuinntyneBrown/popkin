import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PLAN_API } from 'api';
import { Alert, Button, DialogFrame } from 'components';

/** Opened over the Story dialog, so it is named by a title id of its own. */
export const DELETE_STORY = {
  ariaLabelledBy: 'delete-story-title',
  ariaDescribedBy: 'delete-story-desc',
  hasBackdrop: false,
  ariaModal: true,
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

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected delete(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    this.api.deleteStory(this.data.popkinId, this.data.storyId).subscribe({
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
