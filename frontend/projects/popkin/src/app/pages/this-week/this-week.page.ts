import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ErrorScreens,
  PopkinFrame,
  ThisWeekStore,
  ThisWeekView,
  UnreadTracker,
  isoDate,
} from 'api';
import {
  AppScreen,
  Button,
  DayPicker,
  EmptyState,
  FreeHeadline,
  Icon,
  PlanHeader,
  PopkinNav,
  Schedule,
  Shifts,
  ViewNav,
} from 'components';
import { MyHoursData, MyHoursDialog } from '../../dialogs/my-hours/my-hours.dialog';

/**
 * This week (L2-074): the second view of the Schedule tab, seven days from the viewer's today,
 * how many are free each evening, and the chosen evening's headline and timeline. The chosen day
 * is in the address, so a reload keeps it; without one it is today.
 */
@Component({
  selector: 'pk-this-week-page',
  imports: [
    AppScreen,
    Button,
    DayPicker,
    EmptyState,
    FreeHeadline,
    Icon,
    PlanHeader,
    PopkinNav,
    RouterLink,
    Schedule,
    Shifts,
    ViewNav,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './this-week.page.html',
})
export class ThisWeekPage {
  /** The route's `:popkinId`. */
  readonly popkinId = input.required<string>();
  /** The address's `?day=`: the evening chosen. */
  readonly day = input<string>();

  protected readonly store = inject(ThisWeekStore);
  protected readonly frame = inject(PopkinFrame);
  private readonly unread = inject(UnreadTracker);
  private readonly errors = inject(ErrorScreens);
  private readonly dialog = inject(Dialog);

  protected readonly link = computed(() => `/p/${this.popkinId()}/schedule/week`);
  protected readonly everyone = computed(() => `/p/${this.popkinId()}/chat/everyone`);
  /** "Back to {Popkin name}" while Schedules is off (L2-077 AC2). */
  protected readonly home = computed(() => `/p/${this.popkinId()}`);
  protected readonly views = computed(() => [
    { label: 'Time off', link: `/p/${this.popkinId()}/schedule`, current: false },
    { label: 'This week', link: `/p/${this.popkinId()}/schedule/week`, current: true },
  ]);
  protected readonly unreadCount = computed(() => this.unread.forPopkin(this.popkinId()));

  constructor() {
    effect(() => {
      const popkinId = this.popkinId();
      untracked(() => this.frame.open(popkinId));
    });
    effect(() => {
      const popkinId = this.popkinId();
      const day = this.day();
      // The seven days start on the viewer's own today (L2-074 AC1).
      untracked(() => this.store.open(popkinId, day, isoDate(new Date())));
    });
    // L2-051 AC1: someone who is not a member cannot tell the Popkin exists.
    effect(() => {
      if (this.store.state() === 'not-found') untracked(() => this.errors.showNotFound());
    });
  }

  /** "My hours" (L2-074 AC8): my own hours for the seven days; this week shows them once saved. */
  protected openMyHours(event: Event): void {
    const mine = this.store.mine();
    if (!mine) return;
    const opened = this.dialog.open<ThisWeekView, MyHoursData>(MyHoursDialog, {
      data: { popkinId: this.popkinId(), accent: this.frame.accent(), mine },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      restoreFocus: event.currentTarget as HTMLElement,
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    });
    opened.closed.subscribe((saved) => {
      if (saved) this.store.saved(saved);
    });
  }
}
