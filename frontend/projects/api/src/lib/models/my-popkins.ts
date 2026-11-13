import { AvatarView } from './invite';
import { PopkinColour } from './popkin';

/** The latest message of a Popkin's Everyone thread, as its card says it. */
export interface LatestMessageView {
  firstName: string;
  /** Text as typed. It is never markup (L2-052). */
  text: string;
}

/** An active Popkin as a card of My Popkins (L2-017 AC1, AC2). */
export interface ActivePopkinView {
  id: string;
  name: string;
  emoji: string;
  colour: PopkinColour;
  /** ISO date-time; null when the Popkin keeps going. */
  endsAt: string | null;
  memberCount: number;
  /** Up to three members, the Host first. */
  avatars: AvatarView[];
  latestMessage: LatestMessageView | null;
  unreadCount: number;
  everyoneThreadId: string;
  viewerMembershipId: string;
}

/** A wrapped-up Popkin as a row of My Popkins (L2-018 AC1). */
export interface WrappedUpPopkinView {
  id: string;
  name: string;
  emoji: string;
  colour: PopkinColour;
  /** ISO date-time. */
  wrappedUpAt: string;
  peopleCount: number;
  photoCount: number;
}

/** The Popkins a person belongs to, the most recently active first. */
export interface MyPopkinsView {
  active: ActivePopkinView[];
  wrappedUp: WrappedUpPopkinView[];
}
