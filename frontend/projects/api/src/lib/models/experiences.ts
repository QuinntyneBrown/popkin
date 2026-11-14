import { AvatarView } from './invite';
import { PopkinColour } from './popkin';

/** What an experience is: something the group did, a restaurant, or something it wants to do. */
export type ExperienceKind = 'Did' | 'Restaurant' | 'Want';

export type ExperienceFilter = 'all' | 'did' | 'want';

/** An experience as the list shows it (L2-037). */
export interface ExperienceCardView {
  id: string;
  kind: ExperienceKind;
  title: string;
  /** An address that expires; null shows the Popkin's emoji on its colour (L2-040 AC5). */
  pictureUrl: string | null;
  emoji: string;
  colour: PopkinColour;
  sharedBy: { membershipId: string; firstName: string; avatar: AvatarView };
  /** Free text such as "Sat morning"; null when the sharer gave none. */
  when: string | null;
  sharedAt: string;
  /** To one decimal; null when nobody has rated it. */
  average: number | null;
  ratingCount: number;
  keenCount: number;
}

/** The group's score: the average, how many rated, and how many gave each star value. */
export interface ExperienceScoreView {
  average: number | null;
  ratingCount: number;
  /** Five entries, five stars first. */
  counts: { stars: number; count: number }[];
}

/** What one member said with their rating (L2-038 AC4). */
export interface ExperienceCommentView {
  membershipId: string;
  firstName: string;
  avatar: AvatarView;
  stars: number;
  text: string;
  commentedAt: string;
}

/** One experience, on its own page (L2-038). */
/** One member who is keen: a first name and a face. */
export interface KeenMemberView {
  membershipId: string;
  firstName: string;
  avatar: AvatarView;
}

/** Who is keen on an idea (L2-042 AC1): how many, whether the reader is, the first four. */
export interface KeenView {
  count: number;
  mine: boolean;
  members: KeenMemberView[];
}

export interface ExperienceDetailView extends ExperienceCardView {
  place: string | null;
  score: ExperienceScoreView;
  myRating: { stars: number; comment: string | null } | null;
  /** The newest first. */
  comments: ExperienceCommentView[];
  /** False for "Want to do" and once the Popkin has wrapped up. */
  canRate: boolean;
  /** Null for anything but "Want to do". */
  keen: KeenView | null;
  /** True for "Want to do" while the Popkin is active. */
  canKeen: boolean;
  /** "We did this": for its sharer or the Host, while it is an idea in an active Popkin. */
  canMarkDone: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/** What rating answers: the member's stars and the group's new score (L2-039 AC2). */
export interface RatingResultView {
  stars: number;
  score: ExperienceScoreView;
}

/** What the Share an experience dialog sends (L2-040). */
export interface ExperienceDraft {
  title: string;
  kind: ExperienceKind;
  when: string;
  place: string;
  picture: File | null;
  /** On an edit: take the picture it has away. */
  removePicture?: boolean;
}
