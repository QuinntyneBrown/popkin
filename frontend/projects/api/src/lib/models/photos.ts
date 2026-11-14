import { AvatarView } from './invite';

export type AlbumFilter = 'everyone' | 'mine';

/** A photo as the album lists it. */
export interface PhotoSummaryView {
  id: string;
  caption: string | null;
  uploader: { membershipId: string; firstName: string; avatar: AvatarView };
  /** When it was taken, or added when the file did not say. ISO date-time. */
  takenAt: string;
  addedAt: string;
  /** An address that expires; read the album again for a fresh one. */
  thumbnailUrl: string;
  width: number;
  height: number;
  isMine: boolean;
}

/** One page of the album, the latest first (L2-032). The counts are the whole album's. */
export interface AlbumPageView {
  photoCount: number;
  contributorCount: number;
  contributors: { firstName: string; avatar: AvatarView }[];
  items: PhotoSummaryView[];
  nextCursor: string | null;
  /** False once the Popkin has wrapped up. */
  canAdd: boolean;
}

/** One photo, full screen (L2-033). */
export interface PhotoDetailView {
  id: string;
  uploader: { membershipId: string; firstName: string; displayName: string; avatar: AvatarView };
  addedAt: string;
  takenAt: string;
  caption: string | null;
  imageUrl: string;
  width: number;
  height: number;
  reactions: { emoji: string; count: number; mine: boolean }[];
  commentCount: number;
  /** The newer neighbour in the album, and the older one; null at the ends. */
  previousPhotoId: string | null;
  nextPhotoId: string | null;
  canDelete: boolean;
  isMine: boolean;
}

/** One comment on a photo (L2-035), oldest first. */
export interface PhotoCommentView {
  id: string;
  author: { membershipId: string; firstName: string; avatar: AvatarView };
  addedAt: string;
  text: string;
  /** The member's own, which they may delete (L2-035 AC5). */
  mine: boolean;
}

/** What an upload reports while it runs, then the photo it became. */
export type PhotoUploadEvent =
  { kind: 'progress'; fraction: number } | { kind: 'done'; photo: PhotoSummaryView };
