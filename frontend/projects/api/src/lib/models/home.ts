import { MessageAuthorView } from './chat';
import { AvatarView } from './invite';
import { PopkinColour, PopkinLength } from './popkin';
import { EventView } from './schedule';

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
  /** How long it was chosen to last, which `endsAt` was resolved from. */
  length: PopkinLength;
  /** ISO date-time; null when the Popkin keeps going. */
  endsAt: string | null;
  memberCount: number;
  /** At most four, the Host first. */
  avatars: AvatarView[];
  viewerRole: 'Host' | 'Member';
  viewer: { membershipId: string; firstName: string };
  /** Unread messages of the Everyone thread. */
  unreadCount: number;
  /** Rises with every change of its settings; orders `PopkinChanged` (L2-020). */
  version: number;
  /** Whether Schedules is on, which shows the Schedule tab (L2-072 AC1, L2-077 AC1). */
  schedules: boolean;
  /** Whether Plan is on, which shows the Plan tab (L2-068 AC1, L2-077 AC1). */
  plan: boolean;
  /** The event the Host set (L2-085), or null; always null while Schedules is off. */
  event: EventView | null;
}

/** `GET /api/popkins/{id}/features`: the switched features this Popkin has (L2-077). */
export interface PopkinFeaturesView {
  plan: boolean;
  schedules: boolean;
  /** The Host's choice of each feature the admin app offers the Popkin (L2-153 AC8). */
  choices: FeatureChoiceView[];
}

/** A feature a Popkin may have, as the API names it (L2-152, L2-153). */
export type PopkinFeature = 'Plan' | 'Schedules';

export interface FeatureChoiceView {
  feature: PopkinFeature;
  on: boolean;
}

/** The features a Popkin not yet created is offered: those on for everyone (L2-152 AC8). */
export interface NewPopkinFeaturesView {
  offered: PopkinFeature[];
}

/** The Host's change of the offered features; a feature left out is unchanged (L2-153). */
export interface ChangeFeaturesRequest {
  plan?: boolean;
  schedules?: boolean;
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
