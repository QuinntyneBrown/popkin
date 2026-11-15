import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MyTimeOff, SCHEDULE_API, TimeOffChoice, TimeOffWeekView } from 'api';
import {
  Alert,
  Button,
  DialogFrame,
  LeaveRow,
  SegmentedControl,
  SegmentedOption,
} from 'components';

export interface AddTimeOffData {
  popkinId: string;
  accent: string;
  /** My week as the table shows it, each weekday set to my entry. */
  mine: MyTimeOff;
}

/**
 * "Add my time off" (L2-073): the member's own week, Monday to Friday, each Off, Tentative or
 * Working. It closes with the week as saved; a failure keeps it open with the choices made. A
 * week more than a year ahead cannot be saved (AC5).
 */
@Component({
  selector: 'pk-add-time-off-dialog',
  imports: [Alert, Button, DialogFrame, LeaveRow, SegmentedControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-time-off.dialog.html',
})
export class AddTimeOffDialog {
  protected readonly data = inject<AddTimeOffData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<TimeOffWeekView>>(DialogRef);
  private readonly api = inject(SCHEDULE_API);

  protected readonly options: SegmentedOption<TimeOffChoice>[] = [
    { value: 'Off', label: 'Off' },
    { value: 'Tentative', label: 'Tentative' },
    { value: 'Working', label: 'Working' },
  ];
  protected readonly description = `Your week of ${this.data.mine.label}. Tentative means you plan to be off but haven’t confirmed it with work.`;
  protected readonly choices = signal<TimeOffChoice[]>(
    this.data.mine.days.map((day) => day.choice),
  );
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected choose(index: number, choice: string): void {
    if (this.busy()) return;
    this.choices.update((choices) =>
      choices.map((current, i) => (i === index ? (choice as TimeOffChoice) : current)),
    );
  }

  /** "Save" is sent once; while it goes, it reads "Saving…" (L2-073 AC2). */
  protected save(): void {
    if (this.busy() || this.data.mine.tooFar) return;
    this.busy.set(true);
    this.failed.set(false);
    this.api
      .setTimeOff(this.data.popkinId, this.data.mine.membershipId, {
        week: this.data.mine.week,
        days: this.choices(),
      })
      .subscribe({
        next: (saved) => this.ref.close(saved),
        error: () => {
          this.busy.set(false);
          this.failed.set(true);
        },
      });
  }
}
