import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PhotoViewStore } from 'api';
import { Alert, Button, DialogFrame } from 'components';

export interface DeletePhotoData {
  accent: string;
  /** The photo view's store, which deletes the photo it shows. */
  store: PhotoViewStore;
}

/**
 * "Delete this photo?" (L2-036 AC2): the question before a photo goes from Photos and from chat
 * for everyone. Busy while it deletes; a failure keeps it open and says so. It closes with true
 * once the photo is gone.
 */
@Component({
  selector: 'pk-delete-photo-dialog',
  imports: [Alert, Button, DialogFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-photo.dialog.html',
})
export class DeletePhotoDialog {
  protected readonly data = inject<DeletePhotoData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly busy = this.data.store.deleting;
  protected readonly failed = this.data.store.deleteFailed;

  protected async delete(): Promise<void> {
    if (this.busy()) return;
    if (await this.data.store.remove()) this.ref.close(true);
  }

  protected keep(): void {
    this.ref.close(false);
  }
}
