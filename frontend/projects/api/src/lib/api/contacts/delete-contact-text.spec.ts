import { describe, expect, it } from 'vitest';
import { deleteContactSentence, deleteFailed } from './delete-contact-text';

describe('deleteContactSentence', () => {
  // L2-132 AC1; zero counts are left out (ruled 2026-11-16)
  it.each([
    [
      { timelineEntries: 5, followUps: 1, memories: 7 },
      'Chidi’s profile, 5 timeline entries, 1 follow-up and 7 memories and files go for good.',
    ],
    [
      { timelineEntries: 1, followUps: 2, memories: 1 },
      'Chidi’s profile, 1 timeline entry, 2 follow-ups and 1 memory or file go for good.',
    ],
    [
      { timelineEntries: 0, followUps: 3, memories: 0 },
      'Chidi’s profile and 3 follow-ups go for good.',
    ],
    [{ timelineEntries: 0, followUps: 0, memories: 0 }, 'Chidi’s profile goes for good.'],
  ])('with %o reads "%s"', (counts, start) =>
    expect(deleteContactSentence('Chidi', counts)).toBe(
      `${start} Your Popkins don’t change, and Chidi isn’t told.`,
    ),
  );
});

describe('deleteFailed', () => {
  it('says nothing was removed (L2-132 AC3)', () =>
    expect(deleteFailed('Chidi')).toEqual({
      heading: 'We couldn’t delete Chidi.',
      text: 'Nothing was removed. Check your connection and try again.',
    }));
});
