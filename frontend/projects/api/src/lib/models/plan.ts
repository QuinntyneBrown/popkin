import { AvatarView } from './invite';

/** The four columns of the plan board, in order (L2-068 AC3). */
export type StoryColumn = 'Backlog' | 'ToDo' | 'Doing' | 'Done';

/** The five tags of a story (L2-069 AC1). */
export type StoryTag = 'Travel' | 'Stay' | 'Food' | 'Money' | 'Fun';

/** The sprint: one per Popkin, from its first story, 28 days (L2-068). */
export interface SprintView {
  name: string;
  /** `yyyy-mm-dd`. */
  firstDay: string;
  lastDay: string;
  daysLeft: number;
}

/** A member who owns a story. */
export interface StoryOwnerView {
  membershipId: string;
  firstName: string;
  avatar: AvatarView;
}

/** A story on the board (L2-068 AC4). */
export interface StoryView {
  id: string;
  title: string;
  column: StoryColumn;
  points: number;
  tag: StoryTag;
  owner: StoryOwnerView | null;
  /** `yyyy-mm-dd`, or null. */
  dueDate: string | null;
  /** Always 0 until story comments exist. */
  commentCount: number;
  addedByMembershipId: string;
  /** Whether the viewer may delete it: who added it, its owner or the Host (L2-070 AC4). */
  canDelete: boolean;
  addedAt: string;
}

/** How the sprint is going (L2-068 AC7): positive behind, negative ahead. */
export interface PlanProgressView {
  pointsLeft: number;
  behind: number;
  /** The points left at the end of each day of the sprint so far. */
  sparkline: number[];
}

/** `GET /api/popkins/{id}/plan` (L2-068). */
export interface PlanBoardView {
  sprint: SprintView | null;
  stories: StoryView[];
  progress: PlanProgressView | null;
  version: number;
}
