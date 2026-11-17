import { MemberBriefView } from './invite';

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
export type StoryOwnerView = MemberBriefView;

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

/** How the forecast reads (L2-071 AC3). */
export type ForecastKind = 'Late' | 'Early' | 'LastDay' | 'NoProgress' | 'Done';

/** When the plan finishes: `days` late or early, 0 on the last day; below 0 when done late. */
export interface ForecastView {
  kind: ForecastKind;
  /** `yyyy-MM-dd`; null for no progress. */
  date: string | null;
  days: number;
}

/** The points left at the end of one day of the sprint. */
export interface BurnDayView {
  day: string;
  pointsLeft: number;
}

/** `GET /api/popkins/{id}/plan/burn-down` (L2-071). */
export interface BurnDownView {
  sprint: SprintView | null;
  startPoints: number;
  pointsLeft: number;
  /** Positive behind, negative ahead. */
  behind: number;
  forecast: ForecastView | null;
  days: BurnDayView[];
  /** The three biggest stories in To do and Doing. */
  biggest: StoryView[];
}

/** `GET /api/popkins/{id}/plan` (L2-068). */
export interface PlanBoardView {
  sprint: SprintView | null;
  stories: StoryView[];
  progress: PlanProgressView | null;
  version: number;
}

/** `GET …/plan/summary`: the home's Plan section (L2-075 AC1); none before the first story. */
export interface PlanSummaryView {
  pointsLeft: number;
  behind: number;
  /** The three biggest stories still open. */
  biggest: StoryView[];
}

/** `POST …/plan/stories`: a new story goes to Backlog or To do (L2-069). */
export interface NewStoryRequest {
  title: string;
  column: 'Backlog' | 'ToDo';
  points: number;
  ownerMembershipId: string | null;
  tag: StoryTag;
}

/** `PUT …/plan/stories/{storyId}`: every field of a story, the due date as `yyyy-MM-dd` or null (L2-070 AC3, AC8). */
export interface StoryRequest {
  title: string;
  column: StoryColumn;
  points: number;
  ownerMembershipId: string | null;
  tag: StoryTag;
  dueDate: string | null;
}
