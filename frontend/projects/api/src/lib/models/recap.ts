import { AvatarView } from './invite';
import { PopkinColour } from './popkin';

/** What wrapping up answers (L2-043 AC3). */
export interface WrapUpResult {
  popkinId: string;
  wrappedUpAt: string;
}

/** What the wrap-up screen says of the recap to come. */
export interface WrapUpPreviewView {
  memberCount: number;
  photoCount: number;
  messageCount: number;
}

/** The recap of a wrapped-up Popkin (L2-046). */
export interface RecapView {
  id: string;
  name: string;
  emoji: string;
  colour: PopkinColour;
  startedAt: string;
  wrappedUpAt: string;
  keepPhotos: boolean;
  /** When the photos of an album that was not kept go; null for one that is kept. */
  photosRemoveAt: string | null;
  /** When they went. */
  photosRemovedAt: string | null;
  isHost: boolean;
  peopleCount: number;
  messageCount: number;
  photoCount: number;
  /** At most three; none once the photos were removed. */
  photos: { id: string; thumbnailUrl: string }[];
  /** At most five, the Host first. */
  avatars: AvatarView[];
  topRated: {
    experienceId: string;
    title: string;
    /** An address that expires; null for an experience without a picture. */
    pictureUrl: string | null;
    average: number;
    ratingCount: number;
    sharedBy: { firstName: string };
  } | null;
}

/** The zip of a Popkin's album, as it is prepared (L2-046 AC4). */
export interface AlbumExportView {
  id: string;
  status: 'Preparing' | 'Ready' | 'Failed';
  photosDone: number;
  photosTotal: number;
  /** An address that expires, once the zip is ready. */
  downloadUrl: string | null;
}
