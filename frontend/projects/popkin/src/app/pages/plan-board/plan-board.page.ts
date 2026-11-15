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
import { ErrorScreens, PlanBoardStore, PopkinFrame, UnreadTracker } from 'api';
import {
  AppScreen,
  Board,
  BoardColumn,
  Button,
  Chip,
  EmptyState,
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
