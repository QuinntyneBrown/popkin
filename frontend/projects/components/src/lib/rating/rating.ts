import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Rating (docs/design-system/components/rating.html): the average of an experience's ratings
 * beside one star, and how many ratings there are: "4.8 · 11 ratings". The number is always
 * shown, so the score never depends on the star's colour. Without a `value` it is the words
 * alone, for an experience nobody has rated.
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

  /** The words after the number, set off from it by a dot. */
  protected readonly rest = computed(() => (this.label() ? ` · ${this.label()}` : ''));
}
