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
  EXPERIENCE_FILTERS,
  ErrorScreens,
  ExperienceFilter,
  ExperiencesStore,
  PopkinFrame,
  UnreadTracker,
  filterOf,
} from 'api';
import {
  AppScreen,
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

/**
 * Experiences (L2-037): what the group did and what it wants to do, as cards, the newest
 * first, under "All", "We did" or "Want to do". The filter is in the address, so a filtered
 * list is the same after a reload.
 */
@Component({
  selector: 'pk-experiences-page',
  imports: [
    AppScreen,
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
  protected readonly sharing = computed(() => ['loading', 'ready'].includes(this.store.state()));
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
}
