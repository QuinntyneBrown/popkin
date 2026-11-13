import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ACCOUNT_API,
  DeletionImpactView,
  POPKIN_REALTIME,
  POPKINS_SNAPSHOT,
  SessionStore,
  hostedLine,
} from 'api';
import { Alert, Button, DialogFrame, TextField } from 'components';
import { Toaster } from '../../toasts/toaster';

/** The word typed to confirm (L2-049 AC2). */
const CONFIRMATION = 'delete';

/**
 * "Delete your account?" (L2-049): what is removed and what stays without the person's name,
 * the active Popkins they host, which wrap up, and "delete" typed before the final button is
 * enabled. It opens with the deletion impact already read.
 */
@Component({
  selector: 'pk-delete-account-dialog',
  imports: [Alert, Button, DialogFrame, ReactiveFormsModule, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-account.dialog.html',
})
export class DeleteAccountDialog {
  private readonly impact = inject<DeletionImpactView>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly api = inject(ACCOUNT_API);
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly sessions = inject(SessionStore);
  private readonly snapshot = inject(POPKINS_SNAPSHOT);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);

  protected readonly hosted = hostedLine(this.impact.hostedActivePopkins.map((p) => p.name));
  protected readonly confirmation = new FormControl('', { nonNullable: true });
  private readonly typed = toSignal(this.confirmation.valueChanges, { initialValue: '' });
  protected readonly canDelete = computed(() => this.typed().trim().toLowerCase() === CONFIRMATION);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected delete(): void {
    if (!this.canDelete() || this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    // Escape does not close it while the request is under way.
    this.ref.disableClose = true;
    this.api.deleteAccount().subscribe({
      next: () => {
        this.realtime.stop();
        this.sessions.clear();
        // Nothing of the person stays on the device (L2-054).
        this.snapshot.clear();
        this.ref.close();
        void this.router
          .navigateByUrl('/')
          .then(() =>
            this.toaster.show(
              'success',
              'Your account is deleted',
              'Your personal data is erased within 30 days.',
            ),
          );
      },
      error: () => {
        this.ref.disableClose = false;
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }

  protected keep(): void {
    this.ref.close();
  }
}
