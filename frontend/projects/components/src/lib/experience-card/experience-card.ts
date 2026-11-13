import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar, PersonAvatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';
import { Rating } from '../rating/rating';

/**
 * Experience card (docs/design-system/components/card.html, `exp-card`): one experience in the
 * grid of Experiences, `ul[pk-experience-grid]`. The whole card is one link. It shows the
 * picture, or the Popkin's `emoji` on its colour where there is none (L2-040 AC5), the `kind` on
 * a tag over it, the title, who shared it and when, and at the end either the average of its
 * ratings with how many there are, "4.7 (11)", or, for one the group wants to do, how many are
 * `keen`. Set `data-accent` on an ancestor.
 */
@Component({
  selector: 'li[pk-experience-card]',
  imports: [Avatar, Icon, Rating, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experience-card.html',
  styleUrl: './experience-card.scss',
})
export class ExperienceCard {
  /** The route that opens the experience. */
  readonly link = input.required<string | readonly unknown[]>();
  readonly title = input.required<string>();
  /** The kind, in words, on the tag: "Something we did", "Restaurant", "Want to do". */
  readonly kind = input.required<string>();
  /** The experience's picture. Decoration: the title names the experience. */
  readonly photo = input<string | null>(null);
  /** The Popkin's emoji, shown on its colour when there is no picture. */
  readonly emoji = input<string>();
  /** Who shared it and when: "Mara · Sat morning". */
  readonly by = input('');
  readonly avatar = input<PersonAvatar | null>(null);
  /** The average of its ratings, as it reads: "4.8". None when nobody has rated it. */
  readonly rating = input<string | null>(null);
  /** How many ratings there are, as a bare number: "11". */
  readonly count = input<string>();
  /** How many are keen on one the group wants to do, in words: "7 keen". */
  readonly keen = input<string>();
}
