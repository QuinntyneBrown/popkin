import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Rating panel (docs/design-system/components/rating.html, `star-btns`): where a member rates
 * an experience, on the Popkin's tint. Its `heading` asks ("How was it for you?") or thanks
 * ("Thanks! Your rating"), and under it are five star buttons of 48 px, one radio group named by
 * the heading: "1 star" to "5 stars". The stars up to the member's are filled and checked
 * (L2-039 AC1, AC2).
 *
 * Tab enters on the member's star, or on the first while there is none; the arrow keys move by
 * one star and choose it, as a radio group does (AC4). The panel keeps nothing: a star chosen
 * is told as `rated`, and the consumer sets `value` at once and puts it back if the rating is
 * not saved (AC5). While `busy` a choice is ignored and the group says it is disabled; the
 * focus stays where it is.
 *
 * Slot: the default slot is under the stars, for "Add a comment" or "Edit your comment". Set
 * `data-accent` on an ancestor.
 */
@Component({
  selector: 'div[pk-rating-panel]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rating-panel.html',
  styleUrl: './rating-panel.scss',
  host: { class: 'card card--tint card--center' },
})
export class RatingPanel {
  /** The panel's `h2`, the name of the stars: "How was it for you?", "Thanks! Your rating". */
  readonly heading = input.required<string>();
  /** The id of the heading, where a screen has more than one panel. */
  readonly headingId = input('rate-h');
  /** The member's rating, from 1 to 5. Null while they have not rated. */
  readonly value = input<number | null>(null);
  /** The names of the five stars, the first star first. */
  readonly names = input<readonly string[]>(['1 star', '2 stars', '3 stars', '4 stars', '5 stars']);
  /** A rating is being saved: a choice is ignored until it is. */
  readonly busy = input(false);

  /** The member chose this many stars. */
  readonly rated = output<number>();

  protected readonly stars = [1, 2, 3, 4, 5];
  /** The star Tab lands on: the member's, or the first. */
  protected readonly entry = computed(() => this.value() ?? 1);

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('button');

  protected choose(star: number): void {
    if (this.busy() || star === this.value()) return;
    this.rated.emit(star);
  }

  protected move(event: KeyboardEvent, star: number): void {
    const keys: Record<string, number> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
    };
    const step = keys[event.key];
    if (!step) return;
    event.preventDefault();
    if (this.busy()) return;
    const next = ((star - 1 + step + this.stars.length) % this.stars.length) + 1;
    this.buttons()[next - 1].nativeElement.focus();
    this.choose(next);
  }
}
