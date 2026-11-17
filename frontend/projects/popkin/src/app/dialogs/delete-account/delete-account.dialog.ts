import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  ACCOUNT_API,
  ConfirmDialogState,
  DeletionImpactView,
  SessionTeardown,
  Toaster,
  hostedLine,
} from 'api';
import { Alert, Button, DialogFrame, Term, TermList, TextField } from 'components';

/** What is removed and what stays without the person's name (L2-049 AC1). */
const OUTCOMES: readonly Term[] = [
  { term: 'Removed:', text: 'your name, photo, phone number and direct messages.' },
  { term: 'Kept, without your name:', text: 'your messages and photos in Popkins.' },
];

/** The word typed to confirm (L2-049 AC2). */
const CONFIRMATION = 'delete';

/**
 * "Delete your account?" (L2-049): what is removed and what stays without the person's name,
 * the active Popkins they host, which wrap up, and "delete" typed before the final button is
 * enabled. It opens with the deletion impact already read.
 */
@Component({
  selector: 'pk-delete-account-dialog',
  imports: [Alert, Button, DialogFrame, ReactiveFormsModule, TermList, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-account.dialog.html',
})
export class DeleteAccountDialog {
  private readonly impact = inject<DeletionImpactView>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly api = inject(ACCOUNT_API);
  private readonly teardown = inject(SessionTeardown);
  private readonly toaster = inject(Toaster);

  protected readonly outcomes = OUTCOMES;
  protected readonly hosted = hostedLine(this.impact.hostedActivePopkins.map((p) => p.name));
  protected readonly confirmation = new FormControl('', { nonNullable: true });
  private readonly typed = toSignal(this.confirmation.valueChanges, { initialValue: '' });
  protected readonly canDelete = computed(() => this.typed().trim().toLowerCase() === CONFIRMATION);
  private readonly state = new ConfirmDialogState(this.ref);
  protected readonly busy = this.state.busy;
  protected readonly failed = this.state.failed;

  protected async delete(): Promise<void> {
    if (!this.canDelete()) return;
    if (!(await this.state.send(() => this.api.deleteAccount()))) return;
    this.ref.close();
    await this.teardown.end('/');
    this.toaster.show(
      'success',
      'Your account is deleted',
      'Your personal data is erased within 30 days.',
    );
  }

  protected keep(): void {
    this.ref.close();
  }
}
