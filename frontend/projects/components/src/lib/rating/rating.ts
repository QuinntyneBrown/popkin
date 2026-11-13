import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Rating (docs/design-system/components/rating.html): the average of an experience's ratings
 * beside one star, and how many ratings there are: "4.8 · 11 ratings". The number is always
 * shown, so the score never depends on the star's colour. Without a `value` it is the words
 * alone, for an experience nobody has rated.
 *
 * On an experience card the number of ratings is the `count` in brackets, "4.8 (11)"; on a
 * comment the value is one member's stars, and `prefix` says so to assistive technology
 * ("Rated 5").
 */
@Component({
  selector: 'span[pk-rating]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rating.html',
  styleUrl: './rating.scss',
  host: { class: 'rating' },
})
export class Rating {
  /** The average, as it reads: "4.8". */
  readonly value = input<string | null>(null);
  /** How many ratings it is the average of: "11 ratings". */
  readonly label = input('');
  /** How many ratings there are, as a bare number in brackets after the average: "11". */
  readonly count = input<string>();
  /** Said before the value to assistive technology only: "Rated". */
  readonly prefix = input<string>();

  /** The words after the number, set off from it by a dot. */
  protected readonly rest = computed(() => (this.label() ? ` · ${this.label()}` : ''));
}
