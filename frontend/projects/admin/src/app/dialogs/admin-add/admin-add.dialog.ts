import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ADMIN_ACCESS_API, AdminRole, AdminRow, ConfirmDialogState, ROLE_SENTENCES } from 'api';
import { tap } from 'rxjs';
import { Alert, Button, ChoiceCard, ChoiceOption, DialogFrame, TextField } from 'components';

export interface AddAdminData {
  /** The admins listed, to name the one an address already belongs to. */
  admins: readonly AdminRow[];
}

const NOT_STAFF = 'Use a @popkin.app address. Only Popkin staff can be admins.';

/**
 * "Add an admin" (L2-119 AC2, AC3): a staff email and a role. It checks the address is a whole
 * @popkin.app one before sending, and closes with the new admin once the invite is sent.
 */
@Component({
  selector: 'pk-admin-add-dialog',
  imports: [Alert, Button, ChoiceCard, DialogFrame, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-add.dialog.html',
})
export class AddAdminDialog {
  private readonly data = inject<AddAdminData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<AdminRow>>(DialogRef);
  private readonly api = inject(ADMIN_ACCESS_API);

  protected readonly roles: ChoiceOption[] = (['Owner', 'Support', 'Viewer'] as const).map(
    (role) => ({ value: role, title: role, sub: ROLE_SENTENCES[role] }),
  );

  protected readonly email = signal('');
  protected readonly role = signal<string>('Support');
  protected readonly emailError = signal<string | undefined>(undefined);
  private readonly state = new ConfirmDialogState(this.ref);
  protected readonly busy = this.state.busy;
  protected readonly failed = this.state.failed;

  protected async send(): Promise<void> {
    if (this.busy()) return;
    const email = this.email().trim();
    if (!/^[^\s@]+@popkin\.app$/i.test(email)) {
      this.emailError.set(NOT_STAFF);
      return;
    }
    this.emailError.set(undefined);
    let row: AdminRow | undefined;
    const sent = await this.state.send(
      () => this.api.addAdmin(email, this.role() as AdminRole).pipe(tap((added) => (row = added))),
      (problem) => {
        if (problem.code === 'email_not_staff') this.emailError.set(NOT_STAFF);
        else if (problem.code === 'admin_exists') this.emailError.set(this.existsText(email));
        else return 'failed';
        return 'idle';
      },
    );
    if (sent && row) this.ref.close(row);
  }

  protected cancel(): void {
    if (!this.busy()) this.ref.close();
  }

  private existsText(email: string): string {
    const admin = this.data.admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
    return admin ? `${admin.name} is already an admin.` : 'That address is already an admin’s.';
  }
}
