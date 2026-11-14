import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Avatar, PersonAvatar } from '../avatar/avatar';
import { IconButton } from '../icon-button/icon-button';
import { Rating } from '../rating/rating';

/**
 * Comment (docs/design-system/components/rating.html and photo-viewer.html, `comment`): what one
 * member said, a row of `pk-comments` or of the photo view's side panel. Their avatar, their
 * first name, and beside it the stars they gave to an experience as a number beside one star
 * ("Rated 5" to assistive technology) or the `time` of a photo's comment ("Sat 7:40"); then
 * their words, as text. A hairline divides it from the comment before, but on the stage.
 *
 * A comment of one's own that may be taken back is `deletable`: "Delete comment" at its end
 * emits `delete`, and the consumer asks first (L2-035 AC5).
 */
@Component({
  selector: 'li[pk-comment]',
  imports: [Avatar, IconButton, Rating],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './comment.html',
  styleUrl: './comment.scss',
  host: { class: 'comment' },
})
export class Comment {
  /** The member's first name. */
  readonly name = input.required<string>();
  readonly avatar = input<PersonAvatar | null>(null);
  /** `sm` for a photo's comments; an experience's are `base`. */
  readonly avatarSize = input<'sm' | 'base'>('base');
  /** The stars the member gave, as a number: "5". */
  readonly stars = input<string | null>(null);
  /** Said before the stars to assistive technology. */
  readonly ratedText = input('Rated');
  /** When it was said, in words: "Sat 7:40". */
  readonly time = input<string>();
  /** The member's words. */
  readonly text = input.required<string>();
  /** One's own comment, which "Delete comment" may take back. */
  readonly deletable = input(false);
  readonly deleteLabel = input('Delete comment');

  /** "Delete comment" was chosen. */
  readonly delete = output<void>();
}
