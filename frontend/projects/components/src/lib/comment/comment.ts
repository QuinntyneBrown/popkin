import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar, PersonAvatar } from '../avatar/avatar';
import { Rating } from '../rating/rating';

/**
 * Comment (docs/design-system/components/rating.html, `comment`): what one member said about an
 * experience, a row of `pk-comments`. Their avatar, their first name, the stars they gave as a
 * number beside one star ("Rated 5" to assistive technology), and their words. A hairline
 * divides it from the comment before.
 */
@Component({
  selector: 'li[pk-comment]',
  imports: [Avatar, Rating],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './comment.html',
  styleUrl: './comment.scss',
  host: { class: 'comment' },
})
export class Comment {
  /** The member's first name. */
  readonly name = input.required<string>();
  readonly avatar = input<PersonAvatar | null>(null);
  /** The stars the member gave, as a number: "5". */
  readonly stars = input<string | null>(null);
  /** Said before the stars to assistive technology. */
  readonly ratedText = input('Rated');
  /** The member's words. */
  readonly text = input.required<string>();
}
