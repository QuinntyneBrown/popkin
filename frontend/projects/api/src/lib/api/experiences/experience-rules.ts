/**
 * What an experience and a comment may be, checked on the device before anything is sent
 * (L2-040 AC2, AC3, L2-041 AC2). The server checks again and has the last word.
 */
import { photoProblem, photoProblemText } from '../invites/profile-photo';

export const TITLE_MAX = 80;
export const PLACE_MAX = 80;
export const WHEN_MAX = 40;
export const COMMENT_MAX = 500;

export type DraftField = 'title' | 'when' | 'place' | 'picture';
/** What is wrong with each field of the dialog, as the message under it says. */
export type DraftProblems = Partial<Record<DraftField, string>>;

const FIELDS: readonly DraftField[] = ['title', 'when', 'place', 'picture'];
const LABELS: Record<DraftField, string> = {
  title: 'Title',
  when: 'When',
  place: 'Place',
  picture: 'Picture',
};
const TITLE_REQUIRED = 'Give it a name.';
const TITLE_LONG = `Keep the title to ${TITLE_MAX} characters.`;
const PLACE_LONG = `Keep the place to ${PLACE_MAX} characters.`;
const WHEN_LONG = `Keep this to ${WHEN_MAX} characters.`;
const COMMENT_REQUIRED = 'Write a few words, or close this to keep just your stars.';
const COMMENT_LONG = `Keep your comment to ${COMMENT_MAX} characters.`;

/** What "Share it" would refuse, field by field in the order of the form; empty when nothing. */
export function draftProblems(draft: {
  title: string;
  when: string;
  place: string;
  picture: { name: string; type: string; size: number } | null;
}): DraftProblems {
  const problems: DraftProblems = {};
  const title = draft.title.trim();
  if (!title) problems.title = TITLE_REQUIRED;
  else if (title.length > TITLE_MAX) problems.title = TITLE_LONG;
  if (draft.when.trim().length > WHEN_MAX) problems.when = WHEN_LONG;
  if (draft.place.trim().length > PLACE_MAX) problems.place = PLACE_LONG;
  // The types and the size are a photo's (L2-031).
  const picture = draft.picture && photoProblem(draft.picture);
  if (picture) problems.picture = photoProblemText(picture);
  return problems;
}

/** The summary over the form: "One thing to fix" and a line per field; null with nothing. */
export function fixSummary(
  problems: DraftProblems,
): { heading: string; items: { field: DraftField; text: string }[] } | null {
  const items = FIELDS.filter((field) => problems[field]).map((field) => {
    const text = problems[field] as string;
    return { field, text: `${LABELS[field]}: ${text.charAt(0).toLowerCase()}${text.slice(1)}` };
  });
  if (!items.length) return null;
  return {
    heading: items.length === 1 ? 'One thing to fix' : `${items.length} things to fix`,
    items,
  };
}

/** The field a refusal of the API is about, with its message; null when it is about none. */
export function refusedField(code: string | undefined): DraftProblems | null {
  switch (code) {
    case 'title_required':
      return { title: TITLE_REQUIRED };
    case 'title_too_long':
      return { title: TITLE_LONG };
    case 'place_too_long':
      return { place: PLACE_LONG };
    case 'when_too_long':
      return { when: WHEN_LONG };
    case 'picture_type_not_allowed':
      return { picture: photoProblemText('type') };
    case 'picture_too_large':
      return { picture: photoProblemText('size') };
    default:
      return null;
  }
}

/**
 * Why "Post comment" will not save this text, or what the API's refusal of it means; null
 * when it will (L2-041 AC2).
 */
export function commentProblem(text: string, code?: string): string | null {
  if (code) {
    if (code === 'comment_required') return COMMENT_REQUIRED;
    return code === 'comment_too_long' ? COMMENT_LONG : null;
  }
  const trimmed = text.trim();
  if (!trimmed) return COMMENT_REQUIRED;
  return trimmed.length > COMMENT_MAX ? COMMENT_LONG : null;
}
