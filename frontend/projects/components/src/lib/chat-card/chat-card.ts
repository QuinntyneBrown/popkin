import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar, PersonAvatar } from '../avatar/avatar';
import { Badge } from '../badge/badge';

/** One of the latest messages on the Chat card. */
export interface ChatPreview {
  /** Who sent it: "Walt". */
  name: string;
  /** When, in words: "9:12". */
  time: string;
  /** The message; one line of it shows. */
  text: string;
  avatar: PersonAvatar;
}

/**
 * The Chat card of the Popkin home (docs/design-system/components/card.html, `card--link` with
 * `chat-preview` rows): the heading, how many messages are new, and the latest messages, each
 * with who sent it, when, and one line of it. The whole card is one link to Chat: set
 * `routerLink` on it. Give it up to four messages, oldest first; the oldest of four shows from 1024 px
 * (L2-058 AC11).
 */
@Component({
  selector: 'a[pk-chat-card]',
  imports: [Avatar, Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-card.html',
  styleUrl: './chat-card.scss',
  host: { class: 'card card--link' },
})
export class ChatCard {
  /** The card's `h2`. */
  readonly heading = input('Chat');
  readonly messages = input.required<readonly ChatPreview[]>();
  /** The messages not yet read; counted on a badge when above zero. */
  readonly newCount = input(0);
  /** The word after the count: "3 new". */
  readonly newUnit = input('new');
}
