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
import { Router } from '@angular/router';
import {
  EXPERIENCES_API,
  EXPERIENCE_FILTERS,
  ErrorScreens,
  ExperienceCardView,
  ExperienceFilter,
  ExperiencesStore,
  PopkinFrame,
  UnreadTracker,
  filterOf,
} from 'api';
import {
  AppScreen,
  Banner,
  Button,
  Chip,
  EmptyState,
  ExperienceCard,
  ExperienceGrid,
  Experiences,
  Fab,
  Icon,
  PopkinNav,
  TabHeader,
} from 'components';
import {
  ShareExperienceData,
  ShareExperienceDialog,
} from '../../dialogs/share-experience/share-experience.dialog';
import { Toaster } from '../../toasts/toaster';

/**
 * Experiences (L2-037): what the group did and what it wants to do, as cards, the newest
 * first, under "All", "We did" or "Want to do". The filter is in the address, so a filtered
 * list is the same after a reload.
 */
@Component({
  selector: 'pk-experiences-page',
  imports: [
    AppScreen,
    Banner,
    Button,
    Chip,
    EmptyState,
    ExperienceCard,
    ExperienceGrid,
    Experiences,
    Fab,
    Icon,
    PopkinNav,
    TabHeader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experiences.page.html',
})
export class ExperiencesPage {
  /** The route's `:popkinId`. */
  readonly popkinId = input.required<string>();
  /** The address's `?filter=`; anything else is "All". */
  readonly filter = input<string>();

  protected readonly store = inject(ExperiencesStore);
  protected readonly frame = inject(PopkinFrame);
  private readonly unread = inject(UnreadTracker);
  private readonly errors = inject(ErrorScreens);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  private readonly toaster = inject(Toaster);
  private readonly api = inject(EXPERIENCES_API);

  protected readonly filters = EXPERIENCE_FILTERS;
  protected readonly cards = computed(() =>
    this.store.cards().map((card) => ({
      ...card,
      link: ['/p', this.popkinId(), 'experiences', card.id],
    })),
  );
  /** The filters show while the list loads and while there is something to filter. */
  protected readonly filtering = computed(() =>
    ['loading', 'ready', 'no-results'].includes(this.store.state()) ? 'Filter' : undefined,
  );
  /** "Share one" in the header and floating: where cards show, or are about to. */
  /** Nothing is shared in a Popkin that has wrapped up (L2-045 AC2). */
  protected readonly sharing = computed(
    () => !this.frame.wrappedUp() && ['loading', 'ready'].includes(this.store.state()),
  );
  protected readonly unreadCount = computed(() => this.unread.forPopkin(this.popkinId()));

  constructor() {
    effect(() => {
      const popkinId = this.popkinId();
      untracked(() => this.frame.open(popkinId));
    });
    effect(() => {
      const popkinId = this.popkinId();
      const filter = filterOf(this.filter());
      untracked(() => this.store.open(popkinId, filter));
    });
    // L2-051 AC1: someone who is not a member cannot tell the Popkin exists.
    effect(() => {
      if (this.store.state() === 'not-found') untracked(() => this.errors.showNotFound());
    });
  }

  /** L2-037 AC4: the filter goes into the address, which the list follows. */
  protected show(filter: ExperienceFilter): void {
    void this.router.navigate([], {
      queryParams: { filter: filter === 'all' ? null : filter },
      replaceUrl: true,
    });
  }

  /** "Share one" (L2-040 AC1); closing it returns focus to what opened it. */
  protected share(): void {
    const opened = this.dialog.open<ExperienceCardView, ShareExperienceData>(
      ShareExperienceDialog,
      {
        data: { popkinId: this.popkinId(), accent: this.frame.accent() },
        ariaLabelledBy: 'dlg-title',
        autoFocus: '#etitle',
        // pk-dialog draws its own backdrop, as the mocks do.
        hasBackdrop: false,
        ariaModal: true,
      },
    );
    opened.closed.subscribe((card) => {
      if (card) this.shared(card);
    });
  }

  /** L2-040 AC4: what was shared is first in the list, under "All" if the filter hides it. */
  private shared(card: ExperienceCardView): void {
    if (!this.store.added(card)) this.show('all');
    this.toaster.show('success', 'Experience shared', `${card.title} is first in the list.`, {
      label: 'Undo',
      run: () => this.takeBack(card),
    });
  }

  /** "Undo" on the toast deletes what was just shared. */
  private takeBack(card: ExperienceCardView): void {
    this.api.remove(this.popkinId(), card.id).subscribe({
      next: () => this.store.removed(card.id),
      error: () =>
        this.toaster.show('danger', 'We couldn’t undo that', `${card.title} is still in the list.`),
    });
  }
}
