import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * What people said (docs/design-system/components/rating.html, `comment`): the comments of an
 * experience under their heading, in the default slot of `pk-experience-detail`. A divided list
 * of `li[pk-comment]`, the newest first.
 *
 * Without a `heading` it is the list alone, with no room above it: the comments of a photo in
 * their dialog, whose title names them (L2-035), oldest first.
 *
 * With `empty` there are no comments yet: the words stand in for the list.
 *
 * Slot: the default slot holds the `li[pk-comment]` rows.
 */
@Component({
  selector: 'section[pk-comments]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './comments.html',
  styleUrl: './comments.scss',
  host: {
    class: 'comments',
    '[class.comments--bare]': '!heading()',
    '[attr.aria-labelledby]': 'labelledBy()',
  },
})
export class Comments {
  /** The section's `h2`: "What people said". None in a dialog, whose title names the list. */
  readonly heading = input<string>();
  readonly headingId = input('comments-h');
  /** What the section says while nobody has commented. Without it the list shows. */
  readonly empty = input<string>();

  protected readonly labelledBy = computed(() => (this.heading() ? this.headingId() : null));
}
