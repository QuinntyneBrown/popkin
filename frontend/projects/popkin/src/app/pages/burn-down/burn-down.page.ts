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
  BurnDownStore,
  ErrorScreens,
  PopkinFrame,
  StoryView,
  UnreadTracker,
  biggestEmpty,
  featureOffText,
  dialogConfig,
} from 'api';
import {
  AppScreen,
  BiggestOpen,
  Burn,
  BurnChart,
  Button,
  EmptyState,
  Icon,
  PlanHeader,
  PopkinNav,
  ViewNav,
} from 'components';
import { NewStoryData, NewStoryDialog } from '../../dialogs/new-story/new-story.dialog';

/**
 * The burn-down (L2-071): the second view of the Plan tab. How many points are left, how far
 * behind or ahead the plan is, when it will finish, the points left by day, and the biggest
 * stories still open.
 */
@Component({
  selector: 'pk-burn-down-page',
  imports: [
    AppScreen,
    BiggestOpen,
    Burn,
    BurnChart,
    Button,
    EmptyState,
    Icon,
    PlanHeader,
    PopkinNav,
    RouterLink,
    ViewNav,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './burn-down.page.html',
})
export class BurnDownPage {
  /** The route's `:popkinId`. */
  readonly popkinId = input.required<string>();

  protected readonly store = inject(BurnDownStore);
  /** Who can switch Plan on again, by who switched it off (L2-077 AC2). */
  protected readonly offText = computed(() => featureOffText('Plan', this.store.offBy()));
  protected readonly frame = inject(PopkinFrame);
  private readonly unread = inject(UnreadTracker);
  private readonly errors = inject(ErrorScreens);
  private readonly dialog = inject(Dialog);

  /** "Back to {Popkin name}" while Plan is off (L2-077 AC2). */
  protected readonly home = computed(() => `/p/${this.popkinId()}`);
  protected readonly views = computed(() => [
    { label: 'Board', link: `/p/${this.popkinId()}/plan`, current: false },
    { label: 'Burn-down', link: `/p/${this.popkinId()}/plan/burn-down`, current: true },
  ]);
  /** The burn-down reaches the sides; an empty state or an error sits in a padded body. */
  protected readonly body = computed(() =>
    this.store.state() === 'loading' || this.store.state() === 'ready' ? 'flush' : 'plain',
  );
  /** "Nothing left open. Nice work, all six of you." (L2-071 AC6). */
  protected readonly nothingOpen = computed(() => biggestEmpty(this.frame.memberCount()));
  protected readonly unreadCount = computed(() => this.unread.forPopkin(this.popkinId()));

  /** "New story" from the empty burn-down (L2-071 AC8); the burn-down follows the change. */
  protected newStory(): void {
    this.dialog.open<StoryView, NewStoryData>(
      NewStoryDialog,
      dialogConfig({
        data: { popkinId: this.popkinId(), accent: this.frame.accent() },
        autoFocus: '#stitle',
      }),
    );
  }

  constructor() {
    effect(() => {
      const popkinId = this.popkinId();
      untracked(() => {
        this.frame.open(popkinId);
        this.store.open(popkinId);
      });
    });
    // L2-051 AC1: someone who is not a member cannot tell the Popkin exists.
    effect(() => {
      if (this.store.state() === 'not-found') untracked(() => this.errors.showNotFound());
    });
  }
}
