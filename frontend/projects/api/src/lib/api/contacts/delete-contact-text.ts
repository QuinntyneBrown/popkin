import { counted } from '../text/counts';
/** The words of Delete a contact (docs/detailed-designs/contacts/delete-contact). */

/** What goes with a contact, as their profile counts it; zero until each feature keeps some. */
export interface ContactCounts {
  timelineEntries: number;
  followUps: number;
  memories: number;
}

export const NO_COUNTS: ContactCounts = { timelineEntries: 0, followUps: 0, memories: 0 };

function countedOrNone(n: number, one: string, many: string): string | null {
  return n === 0 ? null : counted(n, one, many);
}

/** "a, b and c" */
function listed(parts: string[]): string {
  return parts.length < 2
    ? parts.join('')
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * "Chidi’s profile, 5 timeline entries, 1 follow-up and 7 memories and files go for good. Your
 * Popkins don’t change, and Chidi isn’t told." A count of zero is left out (L2-132 AC1).
 */
export function deleteContactSentence(firstName: string, counts: ContactCounts): string {
  const parts = [
    `${firstName}’s profile`,
    countedOrNone(counts.timelineEntries, 'timeline entry', 'timeline entries'),
    countedOrNone(counts.followUps, 'follow-up', 'follow-ups'),
    countedOrNone(counts.memories, 'memory or file', 'memories and files'),
  ].filter((part): part is string => part !== null);
  const goes = parts.length === 1 ? 'goes' : 'go';
  return `${listed(parts)} ${goes} for good. Your Popkins don’t change, and ${firstName} isn’t told.`;
}

/** The alert of a delete that failed (L2-132 AC3). */
export function deleteFailed(firstName: string): { heading: string; text: string } {
  return {
    heading: `We couldn’t delete ${firstName}.`,
    text: 'Nothing was removed. Check your connection and try again.',
  };
}
