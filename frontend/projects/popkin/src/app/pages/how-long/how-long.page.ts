import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  NewPopkinDraft,
  POPKINS_API,
  PopkinLength,
  accentOf,
  comingSundayEvening,
  formatEnd,
  resolveEndsAt,
} from 'api';
import { Alert, Button, ChoiceCard, ChoiceOption, DateButton, Screen, TopBar } from 'components';
import { EndDateData, EndDateDialog } from '../../dialogs/end-date/end-date.dialog';

/** The second step of starting a Popkin: when it wraps up (L2-009). */
@Component({
  selector: 'pk-how-long-page',
  imports: [Alert, Button, ChoiceCard, DateButton, Screen, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './how-long.page.html',
})
export class HowLongPage {
  private readonly store = inject(NewPopkinDraft);
  private readonly dialog = inject(Dialog);
  private readonly popkins = inject(POPKINS_API);
  private readonly router = inject(Router);

  protected readonly status = signal<'idle' | 'popping' | 'failed'>('idle');

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

  /** Creates the Popkin; a failure keeps every choice (L2-009 AC4, AC5). */
  protected popItUp(): void {
    if (this.status() === 'popping') return;
    const draft = this.draft();
    const endsAt = resolveEndsAt(draft.length, new Date(), this.customEnd());
    this.status.set('popping');
    this.popkins
      .createPopkin({
        name: draft.name.trim(),
        emoji: draft.emoji,
        colour: draft.colour,
        length: draft.length,
        endsAt: endsAt?.toISOString() ?? null,
      })
      .subscribe({
        next: (created) => {
          void this.router.navigateByUrl(`/p/${created.id}/created`).then(() => this.store.reset());
        },
        error: () => this.status.set('failed'),
      });
  }
}
