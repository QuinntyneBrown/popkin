import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MyHours, SCHEDULE_API, ThisWeekView, dayError, stretchesOf } from 'api';
import { Alert, Button, DialogFrame, HoursRow, HoursStretch, Stack } from 'components';

export interface MyHoursData {
  popkinId: string;
  accent: string;
  /** My hours for the seven days, as this week shows them. */
  mine: MyHours;
}

/**
 * "My hours" (L2-074 AC8): the member's own working hours for the seven days of this week, up to
 * two stretches a day on the quarter hour. It closes with this week as saved; a day that breaks a
 * rule says so and keeps Save off; a failure keeps it open with the hours entered.
 */
@Component({
  selector: 'pk-my-hours-dialog',
  imports: [Alert, Button, DialogFrame, HoursRow, Stack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-hours.dialog.html',
})
export class MyHoursDialog {
  protected readonly data = inject<MyHoursData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<ThisWeekView>>(DialogRef);
  private readonly api = inject(SCHEDULE_API);

  protected readonly description = `Your working hours, ${this.data.mine.label}. Leave a day blank if you’re not working. Times are on the quarter hour.`;
  protected readonly days = signal(this.data.mine.days);
  protected readonly errors = computed(() => this.days().map((day) => dayError(day)));
  protected readonly invalid = computed(() => this.errors().some((error) => error !== null));
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected change(index: number, stretches: HoursStretch[]): void {
    this.days.update((days) => days.map((day, i) => (i === index ? { ...day, stretches } : day)));
  }

  /** "Save" is sent once; while it goes, it reads "Saving…" (L2-073 AC2). */
  protected save(): void {
    if (this.busy() || this.invalid()) return;
    this.busy.set(true);
    this.failed.set(false);
    this.api
      .setHours(this.data.popkinId, this.data.mine.membershipId, {
        from: this.data.mine.from,
        days: this.days().map((day) => stretchesOf(day)),
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
