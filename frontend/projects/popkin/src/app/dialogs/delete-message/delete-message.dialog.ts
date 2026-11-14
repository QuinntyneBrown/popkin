import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button, DialogFrame } from 'components';

export interface DeleteMessageData {
  accent: string;
}

/**
 * "Delete this message?" (L2-024 AC1): the question before the member's own message goes for
 * everyone in the chat. It closes with true when they choose Delete.
 */
@Component({
  selector: 'pk-delete-message-dialog',
  imports: [Button, DialogFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-message.dialog.html',
})
export class DeleteMessageDialog {
  protected readonly data = inject<DeleteMessageData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected close(deleting: boolean): void {
    this.ref.close(deleting);
  }
}
