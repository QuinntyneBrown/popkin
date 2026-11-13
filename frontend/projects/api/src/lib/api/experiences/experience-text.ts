/**
 * The words of experiences: the kinds, a card's byline, the score and its bars, and what an
 * empty list says (docs/detailed-designs/experiences).
 */
import { ExperienceFilter, ExperienceKind } from '../../models/experiences';
import { AvatarView } from '../../models/invite';
import { accentOf } from '../../models/popkin';

const KINDS: Record<ExperienceKind, string> = {
  Did: 'Something we did',
  Restaurant: 'Restaurant',
  Want: 'Want to do',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The kinds in the order the Share an experience dialog offers them. */
export const EXPERIENCE_KINDS: readonly ExperienceKind[] = ['Did', 'Restaurant', 'Want'];

/** The filters in the order their chips show, with their labels (L2-037 AC4). */
export const EXPERIENCE_FILTERS: readonly { key: ExperienceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'did', label: 'We did' },
  { key: 'want', label: 'Want to do' },
];

export function kindLabel(kind: ExperienceKind): string {
  return KINDS[kind];
}

/**
 * "Mara · Sat morning": who shared it and when (L2-037 AC1). Without a "when", an idea says
 * "Idea" and anything else the day it was shared.
 */
export function byline(experience: {
  kind: ExperienceKind;
  when: string | null;
  sharedAt: string;
  sharedBy: { firstName: string };
}): string {
  const when = experience.when?.trim();
  const shared = new Date(experience.sharedAt);
  const fallback =
    experience.kind === 'Want' ? 'Idea' : `${MONTHS[shared.getMonth()]} ${shared.getDate()}`;
  return `${experience.sharedBy.firstName} · ${when || fallback}`;
}

/** The average to one decimal, "5.0" included (L2-037 AC2); empty when nobody has rated. */
export function averageText(average: number | null): string {
  return average === null ? '' : (Math.round(average * 10) / 10).toFixed(1);
}

/** "11 ratings" under the score. */
export function ratingsText(count: number): string {
  if (count <= 0) return 'No ratings yet';
  return `${count} ${count === 1 ? 'rating' : 'ratings'}`;
}

/** What assistive technology reads for a row of stars: "4.8 out of 5" (L2-038 AC3). */
export function starsLabel(value: number | null): string {
  return value === null ? 'No ratings yet' : `${Math.round(value * 10) / 10} out of 5`;
}

/** The name of a star button: "1 star" to "5 stars" (L2-039 AC1). */
export function starName(stars: number): string {
  return `${stars} ${stars === 1 ? 'star' : 'stars'}`;
}

/** One bar of the score card. */
export interface ScoreBar {
  stars: number;
  /** How far the bar is filled, of 100. */
  percent: number;
  /** The same as text: "5 stars: 9 ratings" (L2-038 AC3). */
  label: string;
}

/**
 * Five bars, five stars first. Each is drawn against the largest count, as the mock draws
 * them, not against the total (the decision in docs/detailed-designs/README.md).
 */
export function scoreBars(counts: readonly { stars: number; count: number }[]): ScoreBar[] {
  const largest = Math.max(0, ...counts.map((entry) => entry.count));
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = counts.find((entry) => entry.stars === stars)?.count ?? 0;
    return {
      stars,
      percent: largest ? Math.round((count / largest) * 100) : 0,
      label: `${starName(stars)}: ${count} ${count === 1 ? 'rating' : 'ratings'}`,
    };
  });
}

/** The filter an address asks for; anything unknown is "All". */
export function filterOf(query: string | null | undefined): ExperienceFilter {
  return query === 'did' || query === 'want' ? query : 'all';
}

/** What Experiences says with nothing to list (L2-037 AC5, AC6). */
export function nothingHere(filter: ExperienceFilter): { heading: string; text: string } {
  if (filter === 'want') {
    return {
      heading: 'Nothing on the wish list',
      text: 'Got an idea for next time? Put it here and see who’s keen.',
    };
  }
  if (filter === 'did') {
    return {
      heading: 'Nothing done yet',
      text: 'Share what the group did or where you ate, and everyone can rate it.',
    };
  }
  return {
    heading: 'Nothing shared yet',
    text: 'Experiences are the things your group did, the places you ate and the ideas for next time. Share one and everyone can rate it.',
  };
}

/** A member's avatar as a component draws it: the accent as its `data-accent`. */
export interface Face {
  initials: string;
  accent: string;
  photoUrl: string | null;
}

export function faceOf(avatar: AvatarView): Face {
  return { initials: avatar.initials, accent: accentOf(avatar.accent), photoUrl: avatar.photoUrl };
}
