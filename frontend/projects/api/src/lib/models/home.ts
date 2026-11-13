import { MessageAuthorView } from './chat';
import { AvatarView } from './invite';
import { PopkinColour } from './popkin';

/** The header of a Popkin's home (L2-019 AC1). */
export interface PopkinHomeView {
  id: string;
  name: string;
  emoji: string;
  colour: PopkinColour;
  status: 'Active' | 'WrappedUp';
  /** When it wrapped up; null while it is active. */
  wrappedUpAt: string | null;
  keepPhotos: boolean;
  /** When the photos of an album that was not kept go (L2-045 AC4). */
  photosRemoveAt: string | null;
  /** When they went. */
  photosRemovedAt: string | null;
  /** ISO date-time; null when the Popkin keeps going. */
  endsAt: string | null;
  memberCount: number;
  /** At most four, the Host first. */
  avatars: AvatarView[];
  viewerRole: 'Host' | 'Member';
  viewer: { membershipId: string; firstName: string };
  /** Unread messages of the Everyone thread. */
  unreadCount: number;
}

/** The latest of the Everyone thread, oldest first, without the notes the system writes. */
export interface ChatPreviewView {
  threadId: string;
  messages: { id: string; author: MessageAuthorView; text: string; sentAt: string }[];
  newCount: number;
}

export interface PhotosSummaryView {
  count: number;
  photos: { id: string; thumbnailUrl: string; caption: string | null }[];
}

export interface ExperiencesSummaryView {
  count: number;
  /** The highest rated first. */
  top: {
    id: string;
    name: string;
    photoUrl: string | null;
    average: number;
    ratingCount: number;
  }[];
}

/** A member as the others see them: a name and a face, never a contact detail (L2-054 AC2). */
export interface MemberView {
  membershipId: string;
  displayName: string;
  avatar: AvatarView;
  role: 'Host' | 'Member';
  isViewer: boolean;
}
