import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { EVENT_LABEL_MAX, EventField, EventView, SCHEDULE_API, eventError, isoDate } from 'api';
import { Alert, Button, DialogFrame, TextField } from 'components';

export interface SetEventData {
  popkinId: string;
  accent: string;
  /** The event as it is, or null while none is set. */
  event: EventView | null;
}

/** What the dialog closes with: the event as saved, or null once it is removed. */
export type SetEventResult = { event: EventView | null } | undefined;

/**
 * "Set the event" (L2-085): the Host's label and first and last day of what the Popkin gets
 * together for. Time off marks its days for everyone. A rule broken keeps Save off and says which;
 * a failure keeps it open with what was entered.
 */
@Component({
  selector: 'pk-set-event-dialog',
  imports: [Alert, Button, DialogFrame, ReactiveFormsModule, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './set-event.dialog.html',
})
export class SetEventDialog {
  protected readonly data = inject<SetEventData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<SetEventResult>>(DialogRef);
  private readonly api = inject(SCHEDULE_API);

  protected readonly labelMax = EVENT_LABEL_MAX;
  protected readonly fields = {
    label: new FormControl(this.data.event?.label ?? '', { nonNullable: true }),
    firstDay: new FormControl(this.data.event?.firstDay ?? '', { nonNullable: true }),
    lastDay: new FormControl(this.data.event?.lastDay ?? '', { nonNullable: true }),
  };
  private readonly label = this.valueOf(this.fields.label);
  private readonly firstDay = this.valueOf(this.fields.firstDay);
  private readonly lastDay = this.valueOf(this.fields.lastDay);
  private readonly error = computed(() =>
    eventError(
      { label: this.label(), firstDay: this.firstDay(), lastDay: this.lastDay() },
      isoDate(new Date()),
    ),
  );
  protected readonly invalid = computed(() => this.error() !== null);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  /** The message of the rule broken on a field (L2-085 AC2); an empty new event says nothing yet. */
  protected errorOf(field: EventField): string | undefined {
    const error = this.error();
    const blank = !this.label() && !this.firstDay() && !this.lastDay();
    return !blank && error?.field === field ? error.message : undefined;
  }

  /** "Save" is sent once; while it goes, it reads "Saving…". */
  protected save(): void {
    if (this.busy() || this.invalid()) return;
    this.send(() =>
      this.api.setEvent(this.data.popkinId, {
        label: this.label().trim(),
        firstDay: this.firstDay(),
        lastDay: this.lastDay(),
      }),
    );
  }

  protected remove(): void {
    if (this.busy()) return;
    this.send(() => this.api.removeEvent(this.data.popkinId));
  }

  private valueOf(control: FormControl<string>) {
    return toSignal(control.valueChanges, { initialValue: control.value });
  }

  private send(request: () => Observable<EventView | null>): void {
    this.busy.set(true);
    this.failed.set(false);
    request().subscribe({
      next: (event) => this.ref.close({ event }),
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }
}
