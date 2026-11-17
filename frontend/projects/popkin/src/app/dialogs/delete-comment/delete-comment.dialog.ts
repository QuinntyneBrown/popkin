import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button, DialogFrame } from 'components';

/**
 * Opened over the Photo comments dialog, so it is named and described by ids of its own; passed
 * to `dialogConfig`, which keeps it modal with no CDK backdrop.
 */
export const DELETE_COMMENT = {
  ariaLabelledBy: 'delete-comment-title',
  ariaDescribedBy: 'delete-comment-desc',
} as const;

export interface DeleteCommentData {
  accent: string;
}

/**
 * "Delete this comment?" (L2-035 AC5): the question before the member's own comment on a photo
 * goes for everyone. It closes with true when they choose Delete.
 */
@Component({
  selector: 'pk-delete-comment-dialog',
  imports: [Button, DialogFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-comment.dialog.html',
})
export class DeleteCommentDialog {
  protected readonly data = inject<DeleteCommentData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected close(deleting: boolean): void {
    this.ref.close(deleting);
  }
}
