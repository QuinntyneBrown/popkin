import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PersonAvatar } from '../avatar/avatar';
import { Button } from '../button/button';
import { ConversationCard } from '../conversation-card/conversation-card';
import { ConversationRow } from '../conversation-row/conversation-row';
import { EmptyState } from '../empty-state/empty-state';
import { GroupLabel } from '../group-label/group-label';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';

/** A `routerLink` value: a path or its segments. */
export type ConversationLink = string | readonly unknown[];

/** The Everyone thread, as the list of conversations shows it. */
export interface EveryoneConversation {
  /** The Popkin's emoji, on the card's tile. */
  emoji: string;
  /** Where the thread opens. */
  link: ConversationLink;
  /** When its latest message was sent, in words: "9:24". Empty when it has none. */
  time: string;
  /** A line of its latest message: "Mara: last call for the canoe sign-up". */
  latest: string;
  /** How many of its messages the member has not read. */
  unread: number;
}

/** One direct message, as the list of conversations shows it. */
export interface DirectConversation {
  /** What tells this row from the others, and `current` names: the other member's membership. */
  key: string;
  /** The other member's name: "Walt Brennan". */
  name: string;
  avatar: PersonAvatar;
  /** Where the direct message opens. */
  link: ConversationLink;
  /** When its latest message was sent, in words: "9:41", "Fri". */
  time: string;
  /** A line of its latest message, with "You: " before the member's own. */
  latest: string;
  /** The member has not read all of it. */
  unread: boolean;
}

/** What `current` is when the Everyone thread is the one open beside the list. */
export const EVERYONE_CONVERSATION = 'everyone';

/**
 * The list of a member's conversations in one Popkin
 * (docs/design-system/components/panes.html, L2-022): the Everyone card first, tinted in the
 * Popkin's colour, with its latest line, its time and the badge that counts what is unread; then
 * the direct messages under "Direct messages", each a row with the other member's avatar and
 * name, bold with a dot named "Unread" while unread. With no direct message it says what one is
 * and offers "New message".
 *
 * It is the content of the Chat tab (`pk-app-screen` with `layout="list"`) and of the list pane
 * beside an open thread (`pk-list-pane`), where `current` marks the thread that is open and the
 * label is one `level` down. While `loading` it is skeletons under a status line; `error` says
 * the list could not be loaded and offers "Try again".
 */
@Component({
  selector: 'div[pk-conversations]',
  imports: [
    Button,
    ConversationCard,
    ConversationRow,
    EmptyState,
    GroupLabel,
    Icon,
    RouterLink,
    Skeleton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './conversations.html',
  styleUrl: './conversations.scss',
  host: { class: 'conversations' },
})
export class Conversations {
  readonly state = input<'loading' | 'ready' | 'error'>('ready');
  /** The Everyone thread; none until it is known. */
  readonly everyone = input<EveryoneConversation | null>(null);
  /** The direct messages, the most recent first. */
  readonly direct = input<readonly DirectConversation[]>([]);
  /** The thread open beside the list: `everyone`, or the `key` of a direct message. */
  readonly current = input<string | null>(null);
  /** The level of the label "Direct messages": 2 on the Chat tab, 3 in the list pane. */
  readonly level = input<2 | 3>(2);

  /** "New message" was chosen in the empty section. */
  readonly newMessage = output<void>();
  /** "Try again" was chosen. */
  readonly retry = output<void>();

  protected readonly everyoneKey = EVERYONE_CONVERSATION;
  protected readonly skeletons = [0, 1, 2, 3];
}
