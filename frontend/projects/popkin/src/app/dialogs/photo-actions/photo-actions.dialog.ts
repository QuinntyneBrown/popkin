import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogFrame, MenuItem, MenuList } from 'components';

export interface PhotoActionsData {
  accent: string;
}

/**
 * The actions of a photo (L2-036 AC2), for its uploader and, in the album, the Host: "Delete
 * photo". It closes with true when that is chosen.
 */
@Component({
  selector: 'pk-photo-actions-dialog',
  imports: [DialogFrame, MenuItem, MenuList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-actions.dialog.html',
})
export class PhotoActionsDialog {
  protected readonly data = inject<PhotoActionsData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected delete(): void {
    this.ref.close(true);
  }
}
