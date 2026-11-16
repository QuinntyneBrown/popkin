import { describe, expect, it } from 'vitest';
import { ContactProfileView } from '../../models/contacts';
import { closestItem, failedText, loadingLine, profileSub } from './contact-profile-text';

const chidi = {
  id: 'c1',
  name: 'Chidi Okafor',
  firstName: 'Chidi',
  knownAs: 'Brother',
  circle: 'Family',
  city: 'Manchester',
  isClosest: true,
} as ContactProfileView;

describe('profileSub', () => {
  // L2-128 AC1
  it.each([
    [{}, 'Brother · Family · Manchester'],
    [{ knownAs: null }, 'Family · Manchester'],
    [{ circle: null }, 'Brother · Manchester'],
    [{ city: null }, 'Brother · Family'],
    [{ knownAs: null, circle: null, city: null }, ''],
  ])('with %o reads "%s"', (change, line) =>
    expect(profileSub({ ...chidi, ...change } as ContactProfileView)).toBe(line),
  );
});

describe('loadingLine and failedText', () => {
  // L2-123 AC1 to AC3; known gap 111
  it('name the contact when the opening screen knew them', () => {
    expect(loadingLine('Chidi')).toBe('Loading Chidi’s profile…');
    expect(failedText('Chidi')).toEqual({
      heading: 'We couldn’t load Chidi’s profile',
      text: 'Chidi’s timeline and notes are safe. Check your connection and try again.',
    });
  });

  it('name nobody, and use no pronoun, when the profile was opened by its address', () => {
    expect(loadingLine(null)).toBe('Loading the profile…');
    expect(failedText(null)).toEqual({
      heading: 'We couldn’t load this profile',
      text: 'The timeline and notes are safe. Check your connection and try again.',
    });
  });
});

describe('closestItem', () => {
  // L2-131 AC1, AC4
  it.each([
    [{}, 'Take Chidi out of Closest', 'Chidi stays in People and Family.'],
    [{ circle: null }, 'Take Chidi out of Closest', 'Chidi stays in People.'],
    [{ isClosest: false }, 'Add Chidi to Closest', 'Chidi shows first in People.'],
  ])('with %o reads "%s"', (change, label, hint) =>
    expect(closestItem({ ...chidi, ...change } as ContactProfileView)).toEqual({ label, hint }),
  );
});
