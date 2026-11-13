import { DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ScanToJoin } from 'api';
import { Alert, Button, DialogFrame, Scanner } from 'components';

/**
 * "Scan to join" (L2-015 AC1 to AC4): the camera reads QR codes until one is a Popkin's invite,
 * which then opens. A camera that cannot be used is explained, with the way to type the code.
 * Closing the dialog stops the camera.
 */
@Component({
  selector: 'pk-scan-to-join-dialog',
  imports: [Alert, Button, DialogFrame, RouterLink, Scanner],
  providers: [ScanToJoin],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scan-to-join.dialog.html',
})
export class ScanToJoinDialog {
  protected readonly scan = inject(ScanToJoin);
  protected readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly router = inject(Router);

  protected readonly denied = computed(() => this.scan.state() === 'denied');
  protected readonly found = computed(() => this.scan.state() === 'found');

  constructor() {
    effect(() => {
      const code = this.scan.code();
      if (!code) return;
      // The dialog says the invite is opening until it has (L2-015 AC2).
      untracked(() => void this.router.navigate(['/i', code]).finally(() => this.ref.close()));
    });
  }
}
