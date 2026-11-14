import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  NewPopkinDraft,
  POPKIN_LENGTHS,
  POPKINS_API,
  PopkinLength,
  accentOf,
  comingSundayEvening,
  formatEnd,
  resolveEndsAt,
} from 'api';
import {
  Alert,
  Button,
  ChoiceCard,
  ChoiceOption,
  DateButton,
  Screen,
  SplitAside,
  Timeline,
  TopBar,
} from 'components';
import { EndDateData, EndDateDialog } from '../../dialogs/end-date/end-date.dialog';
import { Toaster } from '../../toasts/toaster';

/** The second step of starting a Popkin: when it wraps up (L2-009). */
@Component({
  selector: 'pk-how-long-page',
  imports: [Alert, Button, ChoiceCard, DateButton, Screen, SplitAside, Timeline, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './how-long.page.html',
})
export class HowLongPage {
  private readonly store = inject(NewPopkinDraft);
  private readonly dialog = inject(Dialog);
  private readonly popkins = inject(POPKINS_API);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);

  protected readonly status = signal<'idle' | 'popping' | 'failed'>('idle');

  protected readonly draft = this.store.draft;
  protected readonly accent = computed(() => accentOf(this.draft().colour));
  protected readonly lengths: ChoiceOption<PopkinLength>[] = [...POPKIN_LENGTHS];

  /** The end "Until a date" shows: the one picked, else the coming Sunday evening. */
  protected readonly customEnd = computed(() => {
    const picked = this.draft().customEndsAt;
    return picked ? new Date(picked) : comingSundayEvening(new Date());
  });
  protected readonly customEndText = computed(() => `Ends ${formatEnd(this.customEnd())}`);

  /** The picture beside the choices from 768 px: the chosen length as a timeline (L2-058 AC10). */
  protected readonly picture = computed(() => {
    const length = this.draft().length;
    const option = this.lengths.find((o) => o.value === length)!;
    const wrapsUp =
      'Then it wraps up on its own and everyone gets the recap: the people, the photos, the best moment.';
    const pictures = {
      JustToday: { span: 'day', end: 'Midnight', text: wrapsUp },
      TheWeekend: { span: 'weekend', end: 'Sunday, 6 pm', text: wrapsUp },
      UntilDate: { span: 'custom', end: formatEnd(this.customEnd()), text: wrapsUp },
      KeepItGoing: {
        span: 'forever',
        end: 'Whenever you say',
        text: 'It stays open until you wrap it up. Then everyone gets the recap.',
      },
    } as const;
    return { icon: option.icon, title: option.title, ...pictures[length] };
  });

  protected choose(length: string): void {
    this.store.update({ length: length as PopkinLength });
  }

  protected pickEnd(): void {
    const ref = this.dialog.open<Date, EndDateData>(EndDateDialog, {
      data: { endsAt: this.customEnd(), accent: this.accent() },
      ariaLabelledBy: 'end-title',
      ariaDescribedBy: 'end-desc',
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
          if (draft.crewOf) this.inviteCrew(created.id, draft.crewOf);
          void this.router.navigateByUrl(`/p/${created.id}/created`).then(() => this.store.reset());
        },
        error: () => this.status.set('failed'),
      });
  }

  /** "Pop up another with this crew" (L2-046 AC5): the new Popkin is there either way. */
  private inviteCrew(popkinId: string, crewOf: string): void {
    this.popkins.inviteCrew(popkinId, crewOf).subscribe({
      next: () =>
        this.toaster.show(
          'success',
          'Invites are on their way',
          'Everyone from the last Popkin gets one.',
        ),
      error: () =>
        this.toaster.show(
          'danger',
          'We couldn’t invite the crew',
          'Share the code or the link with them instead.',
        ),
    });
  }
}
