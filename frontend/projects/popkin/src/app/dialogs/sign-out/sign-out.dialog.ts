import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AUTH_API, POPKIN_REALTIME, POPKINS_SNAPSHOT, SessionStore, toApiProblem } from 'api';
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
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly sessions = inject(SessionStore);
  private readonly snapshot = inject(POPKINS_SNAPSHOT);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected signOut(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    // Escape does not close it while the request is under way.
    this.ref.disableClose = true;
    this.auth.signOut().subscribe({
      next: () => this.signedOut(),
      error: (error: unknown) => {
        // A session that had already ended is signed out all the same.
        if (toApiProblem(error).status === 401) {
          this.signedOut();
          return;
        }
        this.ref.disableClose = false;
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }

  protected stay(): void {
    this.ref.close();
  }

  private signedOut(): void {
    this.realtime.stop();
    this.sessions.clear();
    // Nothing of the person stays on a device they are signed out of (L2-054).
    this.snapshot.clear();
    this.ref.close();
    void this.router.navigateByUrl('/welcome');
  }
}
