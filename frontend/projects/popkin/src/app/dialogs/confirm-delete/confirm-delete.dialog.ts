import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button, DialogFrame } from 'components';

/** What a confirmation that only asks says: its question, what deleting does, and staying. */
export interface ConfirmDeleteData {
  accent: string;
  heading: string;
  description: string;
  /** The button that deletes nothing: "Keep" or "Cancel". */
  keep: string;
  /** Ids of its own, for a dialog opened over another. */
  titleId?: string;
  descriptionId?: string;
}

/** Delete this comment opens over the Photo comments dialog, so it is named by ids of its own. */
export const DELETE_COMMENT = {
  ariaLabelledBy: 'delete-comment-title',
  ariaDescribedBy: 'delete-comment-desc',
} as const;

/** "Delete this message?" (L2-024 AC1): the member's own message goes for everyone in the chat. */
export function deleteMessage(accent: string): ConfirmDeleteData {
  return {
    accent,
    heading: 'Delete this message?',
    description: 'It’s removed for everyone in this chat.',
    keep: 'Keep',
  };
}

/** "Delete this comment?" (L2-035 AC5): the member's own comment on a photo goes for everyone. */
export function deleteComment(accent: string): ConfirmDeleteData {
  return {
    accent,
    heading: 'Delete this comment?',
    description: 'It will be removed for everyone.',
    keep: 'Cancel',
    titleId: DELETE_COMMENT.ariaLabelledBy,
    descriptionId: DELETE_COMMENT.ariaDescribedBy,
  };
}

/**
 * A confirmation that only asks (ADR 0029): Delete or keep, and the opener deletes. It closes
 * with true when they choose Delete. Delete this message and Delete this comment are this dialog
 * with their own copy.
 */
@Component({
  selector: 'pk-confirm-delete-dialog',
  imports: [Button, DialogFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-delete.dialog.html',
})
export class ConfirmDeleteDialog {
  protected readonly data = inject<ConfirmDeleteData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected close(deleting: boolean): void {
    this.ref.close(deleting);
  }
}
