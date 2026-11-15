import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';

/** The member on a story, as its card shows them. */
export interface StoryCardOwner {
  name: string;
  initials: string;
  photo: string | null;
  /** The avatar's accent, lower case: `coral`. */
  accent: string;
}

/**
 * Story card (docs/design-system/components/plan.html): one story on the plan board (L2-068
 * AC4). Its title, its tag with the tag's dot, its points in a circle named "{n} points", its
 * owner's avatar or a dashed circle named "No one yet", "Due {date}" while it is not done, and,
 * in Done, a muted title with a tick in the Popkin's colour (AC5).
 *
 * A `button` opens the story; a `div` is a card nobody can open, on the board of a wrapped-up
 * Popkin (L2-070 AC7).
 */
@Component({
  selector: 'button[pk-story-card], div[pk-story-card]',
  imports: [Avatar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './story-card.html',
  styleUrl: './story-card.scss',
  host: { class: 'story-card', '[class.story-card--done]': 'done()' },
})
export class StoryCard {
  readonly heading = input.required<string>();
  /** The tag's name: "Travel". */
  readonly tag = input.required<string>();
  readonly points = input.required<number>();
  readonly owner = input<StoryCardOwner | null>(null);
  /** "Due Sep 18", shown while the story is not done. */
  readonly due = input<string | null>(null);
  readonly done = input(false);

  protected readonly tagKey = computed(() => this.tag().toLowerCase());
  protected readonly pointsLabel = computed(() =>
    this.points() === 1 ? '1 point' : `${this.points()} points`,
  );
}
