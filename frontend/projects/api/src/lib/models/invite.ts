import { PopkinColour } from './popkin';

/** A member as an avatar: initials on the colour that stays theirs, or their photo (L2-013 AC6). */
export interface AvatarView {
  initials: string;
  accent: PopkinColour;
  /** An address that expires; null shows the initials. */
  photoUrl: string | null;
}

/**
 * What an invite link shows before joining (L2-012). It is all someone who is not a member
 * learns of a Popkin: no member name but the inviter's first name.
 */
export interface InvitePreviewView {
  state: 'Open' | 'WrappedUp';
  name: string;
  emoji: string;
  colour: PopkinColour;
  memberCount: number;
  /** ISO date-time; null when the Popkin keeps going. */
  endsAt: string | null;
  wrappedUpAt: string | null;
  /** Up to five members, the Host first. */
  avatars: AvatarView[];
  inviter: { firstName: string; avatar: AvatarView };
  /** `popkinId` is set only for a member. */
  viewer: { isMember: boolean; popkinId: string | null };
}

/** Who is already in, for the profile step (L2-058 AC10). */
export interface InviteMembersView {
  members: { displayName: string; avatar: AvatarView }[];
  othersCount: number;
}

/** What the welcome screen says once a person has joined (L2-014 AC1). */
export interface JoinedView {
  popkinId: string;
  membershipId: string;
  displayName: string;
  popkinName: string;
  emoji: string;
  colour: PopkinColour;
  /** Two other members' first names, the Host first. */
  namedMembers: string[];
  othersCount: number;
}
