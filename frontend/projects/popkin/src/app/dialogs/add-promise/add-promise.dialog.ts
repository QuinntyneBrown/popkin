import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PromiseDraft, tomorrowOf } from 'api';
import { Button, DialogFrame, TextField } from 'components';

const TEXT_ERROR = 'Say what you’ll do, so it goes on your follow-ups.';

/**
 * Add a promise (docs/mocks/dialogs/add-promise, known gap 106 ruled): what was said and the
 * day to be reminded, tomorrow at first. It saves nothing; the conversation saves its promises.
 */
@Component({
  selector: 'pk-add-promise-dialog',
  imports: [Button, DialogFrame, ReactiveFormsModule, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-promise.dialog.html',
})
export class AddPromiseDialog {
  private readonly ref = inject<DialogRef<PromiseDraft>>(DialogRef);

  protected readonly text = new FormControl('', { nonNullable: true });
  protected readonly due = new FormControl(tomorrowOf(new Date()), { nonNullable: true });
  private readonly typed = toSignal(this.text.valueChanges, { initialValue: '' });
  private readonly tried = signal(false);
  protected readonly textError = computed(() =>
    this.tried() && !this.typed().trim() ? TEXT_ERROR : undefined,
  );

  protected add(): void {
    this.tried.set(true);
    const text = this.text.value.trim();
    if (!text) return;
    this.ref.close({ text, dueOn: this.due.value || tomorrowOf(new Date()) });
  }
}
