import { Dialog, DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PhotoCommentsStore, accentOf } from 'api';
import { Alert, Comment, Comments, Composer, DialogFrame, EmptyState } from 'components';
import {
  DELETE_COMMENT,
  DeleteCommentDialog,
  DeleteCommentData,
} from '../delete-comment/delete-comment.dialog';

export interface PhotoCommentsData {
  accent: string;
  /** The photo view's comments, shared with its side panel. */
  store: PhotoCommentsStore;
  /** A wrapped-up Popkin: the comments show, with no field and no Delete (L2-045). */
  readOnly: boolean;
}

/**
 * Photo comments, below 1024 px (L2-035): the comments oldest first, with avatar, first name,
 * time and text, an invitation when there are none, and "Add a comment", up to 500 characters
 * with a count near the limit. A comment of one's own offers "Delete comment", which asks first.
 */
@Component({
  selector: 'pk-photo-comments-dialog',
  imports: [Alert, Comment, Comments, Composer, DialogFrame, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-comments.dialog.html',
})
export class PhotoCommentsDialog {
  protected readonly data = inject<PhotoCommentsData>(DIALOG_DATA);
  protected readonly store = this.data.store;
  private readonly dialog = inject(Dialog);
  protected readonly accentOf = accentOf;

  protected post(): void {
    this.store.post();
  }

  /** L2-035 AC5: gone once the member has confirmed. */
  protected async delete(commentId: string): Promise<void> {
    const ref = this.dialog.open<boolean, DeleteCommentData>(DeleteCommentDialog, {
      ...DELETE_COMMENT,
      data: { accent: this.data.accent },
    });
    if (await firstValueFrom(ref.closed)) this.store.remove(commentId);
  }
}
