import { SprintView, StoryColumn, StoryView } from '../../models/plan';
import { accentOf } from '../../models/popkin';
import { weekLabel } from '../schedule/schedule-weeks';

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

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}
