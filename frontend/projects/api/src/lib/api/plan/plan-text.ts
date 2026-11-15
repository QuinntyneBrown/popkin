import { MemberView } from '../../models/home';
import { BurnDownView, ForecastView, SprintView, StoryColumn, StoryView } from '../../models/plan';
import { accentOf } from '../../models/popkin';
import { weekLabel } from '../schedule/schedule-weeks';
import { countWord } from '../schedule/this-week-text';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The columns in the order the board shows them, with their names (L2-068 AC3). */
export const COLUMNS: readonly { key: StoryColumn; heading: string }[] = [
  { key: 'Backlog', heading: 'Backlog' },
  { key: 'ToDo', heading: 'To do' },
  { key: 'Doing', heading: 'Doing' },
  { key: 'Done', heading: 'Done' },
];

/** A column of the board, with what its head shows. */
export interface BoardColumnView {
  key: StoryColumn;
  heading: string;
  count: number;
  points: number;
  hint?: string;
  backlog: boolean;
  stories: StoryCardView[];
}

/** A story as its card shows it (L2-068 AC4, AC5). */
export interface StoryCardView {
  id: string;
  title: string;
  tag: string;
  points: number;
  owner: { name: string; initials: string; photo: string | null; accent: string } | null;
  /** "Due Sep 18" while it is not done, or null. */
  due: string | null;
  done: boolean;
}

export function cardOf(story: StoryView): StoryCardView {
  const owner = story.owner;
  return {
    id: story.id,
    title: story.title,
    tag: story.tag,
    points: story.points,
    owner: owner
      ? {
          name: owner.firstName,
          initials: owner.avatar.initials,
          photo: owner.avatar.photoUrl,
          accent: accentOf(owner.avatar.accent),
        }
      : null,
    due: story.dueDate && story.column !== 'Done' ? dueLabel(story.dueDate) : null,
    done: story.column === 'Done',
  };
}

/** "Planning sprint · Aug 30 – Sep 26 · ", which the days left follow in bold (L2-068 AC2). */
export function sprintLine(sprint: SprintView): string {
  const days = daysBetween(sprint.firstDay, sprint.lastDay) + 1;
  return `${sprint.name} · ${weekLabel(sprint.firstDay, days)} · `;
}

/** "14 days left". */
export function daysLeftLabel(days: number): string {
  return days === 1 ? '1 day left' : `${days} days left`;
}

/** "Due Sep 18" (L2-068 AC4). */
export function dueLabel(day: string): string {
  const [, month, date] = day.split('-').map(Number);
  return `Due ${months[month - 1]} ${date}`;
}

/** The four columns, each with its stories in the order the API gives them (L2-068 AC3). */
export function columnsOf(stories: readonly StoryView[]): BoardColumnView[] {
  return COLUMNS.map(({ key, heading }) => {
    const mine = stories.filter((story) => story.column === key);
    return {
      key,
      heading,
      count: mine.length,
      points: mine.reduce((sum, story) => sum + story.points, 0),
      hint: key === 'Backlog' ? 'Ideas, not this sprint' : undefined,
      backlog: key === 'Backlog',
      stories: mine.map(cardOf),
    };
  });
}

/** "Doing · 8 points · Mara · Stay": where a story is, how big, who is on it and its tag (L2-070 AC1). */
export function storyLine(story: StoryView): string {
  const column = COLUMNS.find((c) => c.key === story.column)?.heading ?? story.column;
  const points = story.points === 1 ? '1 point' : `${story.points} points`;
  return [column, points, story.owner?.firstName ?? 'No one yet', story.tag].join(' · ');
}

/**
 * "Move to {next column}" for a story in Backlog or To do. A story in Doing is marked done
 * instead, and one that is done moves no further (L2-070 AC1).
 */
export function moveOf(column: StoryColumn): { to: StoryColumn; label: string } | null {
  if (column === 'Backlog') return { to: 'ToDo', label: 'Move to To do' };
  if (column === 'ToDo') return { to: 'Doing', label: 'Move to Doing' };
  return null;
}

/** A member as "Who’s on it?" offers them (L2-069 AC1). */
export interface WhoChipView {
  id: string;
  name: string;
  initials: string;
  photo: string | null;
  accent: string;
}

/** Every member by first name with their avatar, in the order the API lists them (L2-069 AC1). */
export function whoChipsOf(members: readonly MemberView[]): WhoChipView[] {
  return members.map((member) => ({
    id: member.membershipId,
    name: member.displayName.trim().split(/\s+/)[0],
    initials: member.avatar.initials,
    photo: member.avatar.photoUrl,
    accent: accentOf(member.avatar.accent),
  }));
}

/** "24 pts left", "1 pt left", or "All done" once none are (L2-071 AC2, AC3). */
export function burnHeadline(pointsLeft: number): string {
  if (pointsLeft <= 0) return 'All done';
  return pointsLeft === 1 ? '1 pt left' : `${pointsLeft} pts left`;
}

/** "7 behind", "3 ahead" or "On track" (L2-071 AC2). */
/** The recap's "12 of 14 stories done", "1 of 1 story done" (L2-075 AC4). */
export function recapLine(done: number, made: number): string {
  return `${done} of ${made} ${made === 1 ? 'story' : 'stories'} done`;
}

/** The sprint chip's status: "7 behind", "3 ahead" or "on track" (L2-068 AC7). */
export function chipStatus(behind: number): string {
  return behind === 0 ? 'on track' : badgeLabel(behind);
}

export function badgeLabel(behind: number): string {
  if (behind > 0) return `${behind} behind`;
  if (behind < 0) return `${-behind} ahead`;
  return 'On track';
}

/** "Finishes Sep 30 · 4 days late", "No progress in the last few days", "Finished Sep 17 · 9 days early"… (L2-071 AC3). */
export function forecastText(forecast: ForecastView, joiner = ' · '): string {
  if (forecast.kind === 'NoProgress' || !forecast.date) return 'No progress in the last few days';
  const date = sprintDayLabel(forecast.date);
  if (forecast.kind === 'LastDay') return `Finishes ${date}, on the last day`;
  const verb = forecast.kind === 'Done' ? 'Finished' : 'Finishes';
  const late = forecast.kind === 'Late' || forecast.days < 0;
  const days = Math.abs(forecast.days);
  if (days === 0) return `${verb} ${date}`;
  return `${verb} ${date}${joiner}${days === 1 ? '1 day' : `${days} days`} ${late ? 'late' : 'early'}`;
}

/**
 * The chart as text (L2-071 AC5): "24 points left, 7 behind. Finishes Sep 30, 4 days late. Points
 * left at the end of each day: Aug 30: 32, …".
 */
export function chartText(view: BurnDownView): string {
  const left =
    view.pointsLeft <= 0
      ? 'No points left'
      : `${view.pointsLeft === 1 ? '1 point' : `${view.pointsLeft} points`} left`;
  const status = view.behind === 0 ? 'on track' : badgeLabel(view.behind);
  const forecast = view.forecast ? ` ${forecastText(view.forecast, ', ')}.` : '';
  const days = view.days.map((d) => `${sprintDayLabel(d.day)}: ${d.pointsLeft}`).join(', ');
  return `${left}, ${status}.${forecast} Points left at the end of each day: ${days}.`;
}

/** "Nothing left open. Nice work, all six of you." (L2-071 AC6). */
export function biggestEmpty(members: number): string {
  if (members <= 1) return 'Nothing left open. Nice work.';
  if (members === 2) return 'Nothing left open. Nice work, both of you.';
  return `Nothing left open. Nice work, all ${countWord(members)} of you.`;
}

/** "Aug 30". */
export function sprintDayLabel(day: string): string {
  const [, month, date] = day.split('-').map(Number);
  return `${months[month - 1]} ${date}`;
}

/** Whole days from one `yyyy-MM-dd` to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}
