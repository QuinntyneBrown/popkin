import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  POPKIN_LENGTHS,
  POPKINS_API,
  PopkinLength,
  PopkinSettingsView,
  comingSundayEvening,
  formatEnd,
  resolveEndsAt,
  stillEnds,
} from 'api';
import { Alert, Button, ChoiceCard, ChoiceOption, DateButton, DialogFrame } from 'components';
import { EndDateData, EndDateDialog } from '../end-date/end-date.dialog';

export interface ChangeLengthData {
  popkinId: string;
  accent: string;
  /** How long it lasts now, chosen when the dialog opens. */
  length: PopkinLength;
  /** When it wraps up now; null when it keeps going. */
  endsAt: string | null;
}

/**
 * "How long should it last?" (L2-020 AC4, AC6): the Host changes when the Popkin wraps up, under
 * the rules of L2-009. The device resolves the end, as when it was started. It closes with the
 * Popkin as saved; a failure keeps it open with the choice and says when it still wraps up.
 */
@Component({
  selector: 'pk-change-length-dialog',
  imports: [Alert, Button, ChoiceCard, DateButton, DialogFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './change-length.dialog.html',
})
export class ChangeLengthDialog {
  protected readonly data = inject<ChangeLengthData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<PopkinSettingsView>>(DialogRef);
  private readonly dialog = inject(Dialog);
  private readonly api = inject(POPKINS_API);

  protected readonly lengths: ChoiceOption<PopkinLength>[] = [...POPKIN_LENGTHS];
  protected readonly length = signal<PopkinLength>(this.data.length);
  /** "Until a date" starts at the Popkin's own end, else at the coming Sunday evening. */
  private readonly customEnd = signal(
    this.data.length === 'UntilDate' && this.data.endsAt
      ? new Date(this.data.endsAt)
      : comingSundayEvening(new Date()),
  );
  protected readonly customEndText = computed(() => `Ends ${formatEnd(this.customEnd())}`);
  /** What still holds when a change fails: "It still wraps up Sunday at 6 pm." */
  protected readonly stillEnds = stillEnds(this.data.endsAt, new Date());
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected choose(length: string): void {
    if (!this.busy()) this.length.set(length as PopkinLength);
  }

  protected pickEnd(): void {
    const ref = this.dialog.open<Date, EndDateData>(EndDateDialog, {
      data: { endsAt: this.customEnd(), accent: this.data.accent },
      ariaLabelledBy: 'end-title',
      ariaDescribedBy: 'end-desc',
      autoFocus: '#day',
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    });
    ref.closed.subscribe((end) => {
      if (end) this.customEnd.set(end);
    });
  }

  /** "Save" is sent once; while it goes, it reads "Saving…" (L2-056 AC3). */
  protected save(): void {
    if (this.busy()) return;
    const length = this.length();
    const endsAt = resolveEndsAt(length, new Date(), this.customEnd());
    this.busy.set(true);
    this.failed.set(false);
    this.api
      .changeLength(this.data.popkinId, { length, endsAt: endsAt?.toISOString() ?? null })
      .subscribe({
        next: (saved) => this.ref.close(saved),
        error: () => {
          this.busy.set(false);
          this.failed.set(true);
        },
      });
  }

  protected cancel(): void {
    this.ref.close();
  }
}
