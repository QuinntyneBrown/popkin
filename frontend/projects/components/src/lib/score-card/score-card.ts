import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Stars } from '../stars/stars';

/** One bar of the score card: how many gave this many stars. */
export interface ScoreBar {
  /** The star value the bar counts: 5, 4, 3, 2 or 1. */
  stars: number;
  /** The bar in words, for assistive technology: "5 stars: 9 ratings". */
  label: string;
  /** How much of the track the bar fills, from 0 to 100. */
  percent: number;
}

/**
 * Score card (docs/design-system/components/rating.html, `score-card`): the group's score of an
 * experience. The average to one decimal, the stars filled to match (one image named
 * "4.8 out of 5"), how many ratings there are, and a bar for each star value. The bars are
 * decoration: each is said in words to assistive technology, and its width comes from the
 * consumer as a percentage.
 *
 * Without an `average` nobody has rated the experience: the stars are empty and the card says
 * so in the words of `empty` (L2-038 AC5).
 */
@Component({
  selector: 'div[pk-score-card]',
  imports: [Stars],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './score-card.html',
  styleUrl: './score-card.scss',
  host: { class: 'card score-card', '[class.score-card--empty]': 'average() === null' },
})
export class ScoreCard {
  /** The average of the ratings, from 1 to 5. Null when nobody has rated the experience. */
  readonly average = input<number | null>(null);
  /** How many ratings there are, in words: "11 ratings". */
  readonly count = input('');
  /** One bar for each star value, the highest first. */
  readonly bars = input<readonly ScoreBar[]>([]);
  /** The name of the list of bars. */
  readonly barsLabel = input('Ratings by stars');
  /** What follows the average in the name of the stars: "4.8 out of 5". */
  readonly outOf = input('out of 5');
  /** What the card says when nobody has rated the experience. */
  readonly empty = input('Nobody has rated it yet');

  /** The average as it reads: "4.8". */
  protected readonly value = computed(() => this.average()?.toFixed(1) ?? '');
}
