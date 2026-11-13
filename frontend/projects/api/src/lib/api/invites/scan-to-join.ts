import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { parseInviteInput } from './invite-input';
import { QR_SCANNER } from './qr-scanner';

/**
 * Scan to join (docs/detailed-designs/invitations/join-by-code): the camera reads QR codes until
 * one is a Popkin invite. `invalid` says the code in view is something else while scanning goes
 * on; `denied` is every way the camera did not start. One per dialog.
 */
@Injectable()
export class ScanToJoin {
  private readonly scanner = inject(QR_SCANNER);
  private readonly origin = inject(DOCUMENT).location.origin;

  private camera?: Subscription;

  readonly state = signal<'starting' | 'scanning' | 'invalid' | 'found' | 'denied'>('starting');
  /** The invite code that was found. */
  readonly code = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  start(video: HTMLVideoElement): void {
    this.stop();
    this.state.set('starting');
    this.camera = this.scanner.start(video).subscribe({
      next: (event) => {
        if (event.kind === 'started') {
          this.state.set('scanning');
          return;
        }
        const code = parseInviteInput(event.text, this.origin);
        if (!code) {
          this.state.set('invalid');
          return;
        }
        this.stop();
        this.code.set(code);
        this.state.set('found');
      },
      error: () => this.state.set('denied'),
    });
  }

  /**
   * "Try the camera again" (L2-015 AC4): back to waiting for the camera, which the dialog then
   * starts on the view it shows again.
   */
  retry(): void {
    this.stop();
    this.state.set('starting');
  }

  /** Stops every camera track. */
  stop(): void {
    this.camera?.unsubscribe();
    this.camera = undefined;
  }
}
