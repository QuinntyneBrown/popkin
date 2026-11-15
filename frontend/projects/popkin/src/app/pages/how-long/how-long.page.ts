import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import {
  NewPopkinCreator,
  NewPopkinDraft,
  POPKIN_LENGTHS,
  PopkinFeature,
  PopkinLength,
  accentOf,
  formatEnd,
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

/**
 * The third step of starting a Popkin: when it wraps up (L2-009). While a feature is offered,
 * "Next" opens "What should it have?"; otherwise it is the last step and pops it up (L2-152).
 */
@Component({
  selector: 'pk-how-long-page',
  imports: [Alert, Button, ChoiceCard, DateButton, Screen, SplitAside, Timeline, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './how-long.page.html',
})
export class HowLongPage {
  private readonly store = inject(NewPopkinDraft);
  private readonly creator = inject(NewPopkinCreator);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);

  /** The features a new Popkin is offered, from the route's resolver (L2-152). */
  readonly offered = input<PopkinFeature[]>([]);
  /** Whether "What should it have?" follows (L2-152 AC1, AC2). */
  protected readonly last = computed(() => this.offered().length === 0);
  protected readonly steps = computed(() => (this.last() ? 3 : 4));

  protected readonly status = this.creator.status;
  protected readonly draft = this.store.draft;
  protected readonly accent = computed(() => accentOf(this.draft().colour));
  protected readonly lengths: ChoiceOption<PopkinLength>[] = [...POPKIN_LENGTHS];

  /** The end "Until a date" shows: the one picked, else the coming Sunday evening. */
  protected readonly customEnd = computed(() => {
    this.draft();
    return this.creator.customEnd();
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

  constructor() {
    this.creator.clear();
  }

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

  protected next(): void {
    void this.router.navigateByUrl('/new/features');
  }

  /** Creates the Popkin when no feature is offered; a failure keeps every choice (L2-009 AC4, AC5). */
  protected popItUp(): void {
    this.creator.popItUp([]);
  }
}
