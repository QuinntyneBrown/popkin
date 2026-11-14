import { AvatarView } from './invite';
import { PopkinColour } from './popkin';

/** The Everyone thread as its screen opens it (L2-021 AC1). */
export interface ThreadView {
  id: string;
  popkinId: string;
  kind: 'Everyone' | 'Direct';
  popkinName: string;
  emoji: string;
  colour: PopkinColour;
  /** ISO date-time; null when the Popkin keeps going. */
  endsAt: string | null;
  memberCount: number;
  hereNow: number;
  presenceVersion: number;
  /** True once the Popkin has wrapped up. */
  readOnly: boolean;
  /** Messages from other members after the viewer's read point. */
  unreadCount: number;
  lastReadMessageId: string | null;
  viewer: { membershipId: string; firstName: string };
  /** The other member of a direct message; null on Everyone. */
  other: ThreadMemberView | null;
}

/** A member as a thread names them: never a phone number or an email (L2-054 AC2). */
export interface ThreadMemberView {
  membershipId: string;
  displayName: string;
  firstName: string;
  avatar: AvatarView;
}

/** The member's threads in one Popkin, as the Chat tab lists them (L2-022). */
export interface ConversationsView {
  viewerMembershipId: string;
  everyone: {
    threadId: string;
    latest: { firstName: string; text: string; isMine: boolean; sentAt: string } | null;
    unreadCount: number;
  };
  /** Direct messages that hold a message, the most recent first. */
  direct: DirectSummaryView[];
}

export interface DirectSummaryView {
  threadId: string;
  other: ThreadMemberView;
  latest: { text: string; isMine: boolean; sentAt: string };
  unreadCount: number;
}

export interface MessageAuthorView {
  membershipId: string;
  firstName: string;
  avatar: AvatarView;
}

/** A message, the same for everyone who receives it: whose it is, is read from its author. */
export interface MessageView {
  id: string;
  /** The Popkin of its thread, so a list can tell a thread it has not read yet. */
  popkinId: string;
  threadId: string;
  /** The name the sender's device gave it; null for a note the system wrote. */
  clientMessageId: string | null;
  kind: 'Member' | 'System';
  author: MessageAuthorView;
  /** Text as typed. It is never markup (L2-052). */
  text: string;
  /** ISO date-time. */
  sentAt: string;
  /** Who chose each emoji, grouped by emoji in the order they were first chosen (L2-024). */
  reactions: ReactionSummary[];
  /** Rises with every change to its reactions, so an older answer never wins. */
  reactionsVersion: number;
  /** The message this one replies to; null when it replies to none (L2-025). */
  quote: QuoteView | null;
}

/** One emoji on a message and the members who chose it. */
export interface ReactionSummary {
  emoji: string;
  membershipIds: string[];
}

/** A message's reactions as they stand after a change, and the version of that change. */
export interface MessageReactions {
  version: number;
  reactions: ReactionSummary[];
}

/** What a reply shows of the message it answers; a deleted one keeps only its id. */
export interface QuoteView {
  messageId: string;
  authorFirstName: string | null;
  /** The first line of its text, at most 120 characters. */
  snippet: string | null;
  deleted: boolean;
}

/** A page of messages, oldest first. */
export interface MessagePageView {
  items: MessageView[];
  hasMore: boolean;
}

/** Who is here now. `version` rises with every change, so a late answer never wins. */
export interface PresenceView {
  version: number;
  hereNow: number;
  members: { membershipId: string; displayName: string; avatar: AvatarView }[];
}

export interface MemberJoinedView {
  membershipId: string;
  firstName: string;
  avatar: AvatarView;
}
