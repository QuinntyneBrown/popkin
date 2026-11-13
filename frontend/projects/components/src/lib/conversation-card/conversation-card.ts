import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Badge } from '../badge/badge';
import { PopkinTile } from '../popkin-tile/popkin-tile';

/**
 * The card of the Everyone thread in a list of threads (docs/design-system/components/card.html,
 * `card--link card--tint card--row`): the Popkin's tile, the thread's title, the time of its
 * last message and a line of it, and with an `unreadCount` the badge that counts the messages not
 * yet read ("3 unread messages", L2-022 AC1). `current` marks the thread that is open beside the list
 * (`aria-current="page"`), which also edges the card. Set `routerLink` on it, and `data-accent`
 * on it or an ancestor.
 */
@Component({
  selector: 'a[pk-conversation-card]',
  imports: [Badge, PopkinTile],
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
  /** How many messages are not yet read: the badge counts them, and the card stands out. */
  readonly unreadCount = input(0);
  readonly current = input(false);

  protected readonly standsOut = computed(() => this.unread() || this.unreadCount() > 0);
  protected readonly countLabel = computed(() =>
    this.unreadCount() === 1 ? '1 unread message' : `${this.unreadCount()} unread messages`,
  );
}
