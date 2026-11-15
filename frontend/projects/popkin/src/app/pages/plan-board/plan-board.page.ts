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
  PlanBoardStore,
  PopkinFrame,
  StoryView,
  UnreadTracker,
  featureOffText,
} from 'api';
import { NewStoryData, NewStoryDialog } from '../../dialogs/new-story/new-story.dialog';
import { StoryClosed, StoryData, StoryDialog } from '../../dialogs/story/story.dialog';
import {
  AppScreen,
  Banner,
  Board,
  BoardColumn,
  Button,
  Chip,
  EmptyState,
  Fab,
  Icon,
  PlanHeader,
  PopkinNav,
  SprintChip,
  StoryCard,
  ViewNav,
} from 'components';

/**
 * The plan board (L2-068): the first view of the Plan tab, four columns of stories and the
 * sprint's state. A wrapped-up Popkin's board is read only: no card opens and there is no
 * "New story" (L2-070 AC7).
 */
@Component({
  selector: 'pk-plan-board-page',
  imports: [
    AppScreen,
    Banner,
    Board,
    BoardColumn,
    Button,
    Chip,
    EmptyState,
    Fab,
    Icon,
    PlanHeader,
    PopkinNav,
    RouterLink,
    SprintChip,
    StoryCard,
    ViewNav,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-board.page.html',
})
export class PlanBoardPage {
  /** The route's `:popkinId`. */
  readonly popkinId = input.required<string>();

  protected readonly store = inject(PlanBoardStore);
  /** Who can switch Plan on again, by who switched it off (L2-077 AC2). */
  protected readonly offText = computed(() => featureOffText('Plan', this.store.offBy()));
  protected readonly frame = inject(PopkinFrame);
  private readonly unread = inject(UnreadTracker);
  private readonly errors = inject(ErrorScreens);
  private readonly dialog = inject(Dialog);

  /** "Back to {Popkin name}" while Plan is off (L2-077 AC2). */
  /** Nobody can change the plan of a Popkin that has wrapped up (L2-070 AC7). */
  protected readonly readOnly = this.frame.wrappedUp;
  /** Ready, and open to change: "New story" shows (L2-069). */
  protected readonly canAdd = computed(() => this.store.state() === 'ready' && !this.readOnly());
  protected readonly home = computed(() => `/p/${this.popkinId()}`);
  /** The sprint chip opens the burn-down (L2-068 AC7). */
  protected readonly burnDown = computed(() => `/p/${this.popkinId()}/plan/burn-down`);
  protected readonly views = computed(() => [
    { label: 'Board', link: `/p/${this.popkinId()}/plan`, current: true },
    { label: 'Burn-down', link: `/p/${this.popkinId()}/plan/burn-down`, current: false },
  ]);
  /** The big four a Popkin with no stories starts with (L2-068 AC9). */
  protected readonly starters = [
    'Pick the dates',
    'Find somewhere to stay',
    'Sort out getting there',
    'Set a budget',
  ];
  /** The board fills the screen to its edges; an empty state or an error sits in a padded body. */
  protected readonly body = computed(() =>
    this.store.state() === 'loading' || (this.store.state() === 'ready' && !this.store.empty())
      ? 'fill'
      : 'plain',
  );
  protected readonly unreadCount = computed(() => this.unread.forPopkin(this.popkinId()));

  /** "New story", from the header, the floating action or a starter with its title (L2-069). */
  protected newStory(title?: string): void {
    const opened = this.dialog.open<StoryView, NewStoryData>(NewStoryDialog, {
      data: { popkinId: this.popkinId(), accent: this.frame.accent(), title },
      ariaLabelledBy: 'dlg-title',
      autoFocus: '#stitle',
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    });
    opened.closed.subscribe((story) => {
      if (story) this.store.added(story);
    });
  }

  /** A story's card opens it, to move it on, mark it done or change it (L2-070 AC1). */
  protected openStory(id: string): void {
    const story = this.store.view()?.stories.find((s) => s.id === id);
    if (!story) return;
    const opened = this.dialog.open<StoryClosed, StoryData>(StoryDialog, {
      data: { popkinId: this.popkinId(), accent: this.frame.accent(), story },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      autoFocus: '#stitle',
      hasBackdrop: false,
      ariaModal: true,
    });
    opened.closed.subscribe((closed) => {
      if (closed === 'deleted') this.store.removed(id);
      else if (closed) this.store.moved(closed);
    });
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
