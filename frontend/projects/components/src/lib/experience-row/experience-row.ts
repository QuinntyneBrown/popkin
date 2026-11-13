import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { Rating } from '../rating/rating';

/**
 * An experience as a row of the Popkin home (docs/design-system/components/card.html,
 * `card--link card--row`): its picture, or its emoji where it has none, its title, its rating
 * and a chevron that says it opens. The whole row is one link: set `routerLink` on it. It is set
 * in from the sides of its section. Set `data-accent` on an ancestor.
 */
@Component({
  selector: 'a[pk-experience-row]',
  imports: [Icon, Rating],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experience-row.html',
  styleUrl: './experience-row.scss',
  host: { class: 'card card--link card--row' },
})
export class ExperienceRow {
  readonly title = input.required<string>();
  /** The experience's picture. Decoration: the title names the experience. */
  readonly photo = input<string | null>(null);
  /** The experience's emoji, shown on the Popkin's tint when it has no picture. */
  readonly emoji = input<string>();
  /** The average of its ratings, as it reads: "4.8". None when nobody has rated it. */
  readonly rating = input<string | null>(null);
  /** How many ratings there are, in words: "11 ratings". */
  readonly ratings = input('');
}
