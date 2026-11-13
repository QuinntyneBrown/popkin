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
}

export interface MessageAuthorView {
  membershipId: string;
  firstName: string;
  avatar: AvatarView;
}

/** A message, the same for everyone who receives it: whose it is, is read from its author. */
export interface MessageView {
  id: string;
  threadId: string;
  /** The name the sender's device gave it; null for a note the system wrote. */
  clientMessageId: string | null;
  kind: 'Member' | 'System';
  author: MessageAuthorView;
  /** Text as typed. It is never markup (L2-052). */
  text: string;
  /** ISO date-time. */
  sentAt: string;
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
