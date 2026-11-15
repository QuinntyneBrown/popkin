import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Board column (docs/design-system/components/plan.html): one column of the plan board
 * (L2-068 AC3). Its name, its number of stories and the sum of their points ("11 pts"); Backlog
 * carries a hint and a dashed edge; a column with no stories reads "Nothing here yet" (AC6).
 *
 * Slot: the default slot holds the column's stories, each an `li` around a `pk-story-card`.
 */
@Component({
  selector: 'section[pk-board-column]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './board-column.html',
  styleUrl: './board-column.scss',
  host: {
    class: 'board__col',
    '[class.board__col--backlog]': 'backlog()',
    '[attr.aria-label]': 'heading()',
  },
})
export class BoardColumn {
  readonly heading = input.required<string>();
  readonly count = input.required<number>();
  readonly points = input.required<number>();
  /** "Ideas, not this sprint". */
  readonly hint = input<string>();
  /** The Backlog column, drawn with a dashed edge. */
  readonly backlog = input(false);

  protected readonly pointsLabel = computed(() => `${this.points()} pts`);
}
