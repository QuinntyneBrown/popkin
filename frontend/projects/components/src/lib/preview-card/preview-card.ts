import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { PopkinTile } from '../popkin-tile/popkin-tile';
import { TimeLeft } from '../time-left/time-left';

/**
 * Preview card (docs/design-system/components/preview-card.html): the Popkin as others will see
 * it, in the aside of Name your Popkin. It follows the name and the emoji as they change, and
 * takes the Popkin's colour from `data-accent` on an ancestor. It draws the parts of a Popkin
 * card (`popkin-card__*`); it is a picture, not a link.
 */
@Component({
  selector: 'div[pk-preview-card]',
  imports: [Avatar, PopkinTile, TimeLeft],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preview-card.html',
  styleUrl: './preview-card.scss',
  host: { class: 'preview-card' },
})
export class PreviewCard {
  /** The Popkin's name; `placeholder` shows while it is empty. */
  readonly name = input.required<string>();
  readonly placeholder = input.required<string>();
  readonly emoji = input.required<string>();
  /** The line under the name: the first message as others will read it. */
  readonly message = input.required<string>();
  /** The Host, whose avatar stands beside `members`. */
  readonly host = input.required<string>();
  readonly hostPhoto = input<string | null>();
  /** Who is in it, in words. */
  readonly members = input.required<string>();
  /** The time it has left, in words. */
  readonly timeLeft = input.required<string>();
}
