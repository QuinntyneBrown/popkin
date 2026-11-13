import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Stars (docs/design-system/components/rating.html, `stars`): a score out of five as five
 * stars, read-only. The stars are one image whose name is the score in words, "4.8 out of 5",
 * so the score never depends on the yellow. A star is filled once the score is past its half:
 * 4.5 fills four, 4.8 five.
 *
 * With a `caption` the words sit beside the stars: "Your rating", above a comment being
 * written.
 */
@Component({
  selector: 'span[pk-stars], div[pk-stars]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stars.html',
  styleUrl: './stars.scss',
})
export class Stars {
  /** The score, from 0 to 5. */
  readonly value = input.required<number>();
  /** The score in words, the name of the image: "4.8 out of 5". */
  readonly label = input.required<string>();
  /** The words beside the stars: "Your rating". */
  readonly caption = input<string>();

  /** Which of the five stars are filled. */
  protected readonly filled = computed(() => {
    const full = Math.ceil(this.value() - 0.5);
    return [1, 2, 3, 4, 5].map((star) => star <= full);
  });
}
