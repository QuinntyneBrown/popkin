import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PopkinTile } from '../popkin-tile/popkin-tile';

/**
 * The card of the Everyone thread in a list of threads (docs/design-system/components/card.html,
 * `card--link card--tint card--row`): the Popkin's tile, the thread's title, the time of its
 * last message and a line of it. `current` marks the thread that is open beside the list
 * (`aria-current="page"`), which also edges the card. Set `routerLink` on it, and `data-accent`
 * on it or an ancestor.
 */
@Component({
  selector: 'a[pk-conversation-card]',
  imports: [PopkinTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './conversation-card.html',
  styleUrl: './conversation-card.scss',
  host: {
    class: 'card card--link card--tint card--row',
    '[attr.aria-current]': "current() ? 'page' : null",
  },
})
export class ConversationCard {
  readonly emoji = input.required<string>();
  /** The name of the thread: "Everyone". */
  readonly title = input.required<string>();
  /** When its last message was sent, in words: "9:24". */
  readonly time = input('');
  /** A line of its last message: "Mara: last call for the canoe sign-up". */
  readonly preview = input('');
  /** It has messages not yet read: the time and the line stand out, and the card says so. */
  readonly unread = input(false);
  readonly current = input(false);
}
