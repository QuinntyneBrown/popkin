import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Likes (docs/design-system/components/contact-id.html): what someone is into, as tags on their
 * profile ("Man City", "Long bike rides"), in the tint of the `data-accent` set on it.
 */
@Component({
  selector: 'ul[pk-likes]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './likes.html',
  styleUrl: './likes.scss',
  host: { class: 'likes' },
})
export class Likes {
  readonly items = input.required<readonly string[]>();
}
