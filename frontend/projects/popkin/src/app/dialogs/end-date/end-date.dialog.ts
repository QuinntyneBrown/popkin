import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { endIsAllowed, fromFields, toDateField, toTimeField } from 'api';
import { Button, DialogFrame, TextField } from 'components';

export interface EndDateData {
  endsAt: Date;
  accent: string;
}

/**
 * "When does it wrap up?" (L2-009 AC2, AC3): a day and a time, at least an hour from now and
 * less than a year away. Nothing is sent until "Pop it up"; the dialog hands the end back.
 */
@Component({
  selector: 'pk-end-date-dialog',
  imports: [Button, DialogFrame, ReactiveFormsModule, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './end-date.dialog.html',
})
export class EndDateDialog {
  protected readonly data = inject<EndDateData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<Date>>(DialogRef);

  protected readonly day = new FormControl(toDateField(this.data.endsAt), { nonNullable: true });
  protected readonly time = new FormControl(toTimeField(this.data.endsAt), { nonNullable: true });
  protected readonly error = signal<string | null>(null);

  protected setTheEnd(event: Event): void {
    event.preventDefault();
    const end = fromFields(this.day.value, this.time.value);
    if (!end || !endIsAllowed(end, new Date())) {
      this.error.set('Pick a time at least an hour from now and less than a year away.');
      return;
    }
    this.ref.close(end);
  }
}
