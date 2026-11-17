import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  ActionDialogState,
  NOTIFICATION_SAVE_FAILED,
  NotificationDialogText,
  REASON_MAX_LENGTH,
} from 'api';
import { Alert, Button, ChangeList, DialogFrame, LimitChange, Textarea } from 'components';
import { Observable } from 'rxjs';

export interface NotificationActionData<T> {
  text: NotificationDialogText;
  /** The confirm button in the danger colour: pausing, switching a kind off. */
  danger: boolean;
  /** What the save changes, "{default}: {old} → {new}" (L2-173 AC4). */
  changes?: readonly LimitChange[];
  /** Sends the change with the reason; the dialog closes with its answer. */
  send: (reason: string | null) => Observable<T>;
}

/**
 * The notification changes that ask for a reason (L2-087 AC1): "Pause all member email?",
 * "Resume sending?" and "Turn {kind} off for everyone?" or back on (L2-170 AC1, AC3, L2-171 AC1,
 * AC3), and "Save new defaults?" with what changes (L2-173 AC4). Focus starts in the reason, which is required. It closes with the saved answer; a failure
 * keeps it open with the reason as typed (L2-087 AC5).
 */
@Component({
  selector: 'pk-notification-action-dialog',
  imports: [Alert, Button, ChangeList, DialogFrame, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notification-action.dialog.html',
})
export class NotificationActionDialog<T> {
  protected readonly data = inject<NotificationActionData<T>>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<T>>(DialogRef);

  protected readonly state = new ActionDialogState('Required', this.ref);
  protected readonly reason = signal('');
  protected readonly maxLength = REASON_MAX_LENGTH;
  protected readonly failed = NOTIFICATION_SAVE_FAILED;
  protected readonly text = this.data.text;
  protected readonly busy = this.state.busy;
  protected readonly action = computed(() => (this.busy() ? this.text.busy : this.text.confirm));

  protected async confirm(): Promise<void> {
    const saved = await this.state.confirm(this.reason(), (reason) => this.data.send(reason));
    if (saved !== undefined) this.ref.close(saved);
  }

  protected cancel(): void {
    if (!this.busy()) this.ref.close();
  }
}
