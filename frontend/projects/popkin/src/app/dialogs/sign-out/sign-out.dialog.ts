import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AUTH_API, ConfirmDialogState, SessionTeardown } from 'api';
import { Alert, Button, DialogFrame } from 'components';

/**
 * "Sign out of Popkin?" (L2-048 AC5): the question before the session ends on this device. On
 * sign out it closes the real-time connection, forgets the person on this device and opens the
 * welcome screen.
 */
@Component({
  selector: 'pk-sign-out-dialog',
  imports: [Alert, Button, DialogFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-out.dialog.html',
})
export class SignOutDialog {
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly auth = inject(AUTH_API);
  private readonly teardown = inject(SessionTeardown);

  private readonly state = new ConfirmDialogState(this.ref);
  protected readonly busy = this.state.busy;
  protected readonly failed = this.state.failed;

  protected async signOut(): Promise<void> {
    // A session that had already ended is signed out all the same.
    const sent = await this.state.send(
      () => this.auth.signOut(),
      (problem) => (problem.status === 401 ? 'done' : 'failed'),
    );
    if (sent) this.signedOut();
  }

  protected stay(): void {
    this.ref.close();
  }

  private signedOut(): void {
    this.ref.close();
    void this.teardown.end('/welcome');
  }
}
