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
import { ErrorScreens, PlanBoardStore, PopkinFrame, StoryView, UnreadTracker } from 'api';
import { NewStoryData, NewStoryDialog } from '../../dialogs/new-story/new-story.dialog';
import { StoryData, StoryDialog } from '../../dialogs/story/story.dialog';
import {
  AppScreen,
  Board,
  BoardColumn,
  Button,
  Chip,
  EmptyState,
  Fab,
  Icon,
  PlanHeader,
  PopkinNav,
  StoryCard,
  ViewNav,
} from 'components';

/**
 * The plan board (L2-068): the first view of the Plan tab, four columns of stories and the
 * sprint's state.
 */
@Component({
  selector: 'pk-plan-board-page',
  imports: [
    AppScreen,
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
  protected readonly frame = inject(PopkinFrame);
  private readonly unread = inject(UnreadTracker);
  private readonly errors = inject(ErrorScreens);
  private readonly dialog = inject(Dialog);

  /** "Back to {Popkin name}" while Plan is off (L2-077 AC2). */
  protected readonly home = computed(() => `/p/${this.popkinId()}`);
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
    const opened = this.dialog.open<StoryView, StoryData>(StoryDialog, {
      data: { popkinId: this.popkinId(), accent: this.frame.accent(), story },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      autoFocus: '#stitle',
      hasBackdrop: false,
      ariaModal: true,
    });
    opened.closed.subscribe((changed) => {
      if (changed) this.store.moved(changed);
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
