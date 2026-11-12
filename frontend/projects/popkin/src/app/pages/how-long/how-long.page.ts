import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NewPopkinDraft, PopkinLength, accentOf, comingSundayEvening, formatEnd } from 'api';
import { Button, ChoiceCard, ChoiceOption, DateButton, Screen, TopBar } from 'components';
import { EndDateData, EndDateDialog } from '../../dialogs/end-date/end-date.dialog';

/** The second step of starting a Popkin: when it wraps up (L2-009). */
@Component({
  selector: 'pk-how-long-page',
  imports: [Button, ChoiceCard, DateButton, Screen, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './how-long.page.html',
})
export class HowLongPage {
  private readonly store = inject(NewPopkinDraft);
  private readonly dialog = inject(Dialog);

  protected readonly draft = this.store.draft;
  protected readonly accent = computed(() => accentOf(this.draft().colour));
  protected readonly lengths: ChoiceOption<PopkinLength>[] = [
    { value: 'JustToday', icon: '☀️', title: 'Just today', sub: 'Wraps up at midnight' },
    { value: 'TheWeekend', icon: '⛺', title: 'The weekend', sub: 'Wraps up Sunday, 6 pm' },
    { value: 'UntilDate', icon: '📅', title: 'Until a date', sub: 'You pick when it ends' },
    {
      value: 'KeepItGoing',
      icon: '🌱',
      title: 'Keep it going',
      sub: 'No end date. Wrap up whenever.',
    },
  ];

  /** The end "Until a date" shows: the one picked, else the coming Sunday evening. */
  protected readonly customEnd = computed(() => {
    const picked = this.draft().customEndsAt;
    return picked ? new Date(picked) : comingSundayEvening(new Date());
  });
  protected readonly customEndText = computed(() => `Ends ${formatEnd(this.customEnd())}`);

  protected choose(length: string): void {
    this.store.update({ length: length as PopkinLength });
  }

  protected pickEnd(): void {
    const ref = this.dialog.open<Date, EndDateData>(EndDateDialog, {
      data: { endsAt: this.customEnd(), accent: this.accent() },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      autoFocus: '#day',
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    });
    ref.closed.subscribe((end) => {
      if (end) this.store.update({ customEndsAt: end.toISOString() });
    });
  }
}
