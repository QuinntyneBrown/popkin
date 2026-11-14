import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JoinCode } from 'api';
import { Button, Screen, SplitAside, TextField, TopBar } from 'components';
import { ScanToJoinDialog } from '../../dialogs/scan-to-join/scan-to-join.dialog';

/**
 * "Got a code?" (L2-015 AC5): a person who cannot scan types the invite code or pastes the
 * link, and a match opens that Popkin's invite.
 */
@Component({
  selector: 'pk-join-code-page',
  imports: [Button, ReactiveFormsModule, Screen, SplitAside, TextField, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './join-code.page.html',
  providers: [JoinCode],
})
export class JoinCodePage {
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  protected readonly join = inject(JoinCode);
  private readonly field = viewChild.required(TextField);

  protected readonly code = new FormControl('', { nonNullable: true });

  constructor() {
    // The field is what the screen is for, as the mock's `autofocus` says.
    afterNextRender(() => this.field().focus());
    // A match opens that Popkin's invite, where joining goes on (journey 2).
    effect(() => {
      const code = this.join.code();
      if (this.join.state() === 'found' && code) void this.router.navigate(['/i', code]);
    });
  }

  protected find(event: Event): void {
    event.preventDefault();
    this.join.find(this.code.value);
  }

  /** "Scan a QR code instead": the same dialog as My Popkins'. */
  protected scan(): void {
    this.dialog.open(ScanToJoinDialog, {
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    });
  }
}
