import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * What people said (docs/design-system/components/rating.html, `comment`): the comments of an
 * experience under their heading, in the default slot of `pk-experience-detail`. A divided list
 * of `li[pk-comment]`, the newest first.
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
  host: { class: 'comments', '[attr.aria-labelledby]': 'headingId()' },
})
export class Comments {
  /** The section's `h2`: "What people said". */
  readonly heading = input.required<string>();
  readonly headingId = input('comments-h');
  /** What the section says while nobody has commented. Without it the list shows. */
  readonly empty = input<string>();
}
