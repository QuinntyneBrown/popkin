import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  CONTACTS_API,
  ConfirmDialogState,
  ContactCounts,
  ContactsFrame,
  deleteContactSentence,
  deleteFailed,
} from 'api';
import { Alert, Button, DialogFrame } from 'components';

export interface DeleteContactData {
  accent: string;
  contactId: string;
  firstName: string;
  counts: ContactCounts;
}

/**
 * "Delete {first name}?" (L2-132): what goes with the contact, then the delete, sent at once and
 * never queued offline. It closes with true once they are gone; the opener opens People.
 */
@Component({
  selector: 'pk-delete-contact-dialog',
  imports: [Alert, Button, DialogFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-contact.dialog.html',
})
export class DeleteContactDialog {
  protected readonly data = inject<DeleteContactData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(CONTACTS_API);
  private readonly frame = inject(ContactsFrame);

  protected readonly sentence = deleteContactSentence(this.data.firstName, this.data.counts);
  protected readonly failure = deleteFailed(this.data.firstName);
  private readonly state = new ConfirmDialogState(this.ref);
  protected readonly busy = this.state.busy;
  protected readonly failed = this.state.failed;

  protected async delete(): Promise<void> {
    if (!(await this.state.send(() => this.api.deleteContact(this.data.contactId)))) return;
    this.frame.refresh();
    this.ref.close(true);
  }

  protected keep(): void {
    this.ref.close(false);
  }
}
