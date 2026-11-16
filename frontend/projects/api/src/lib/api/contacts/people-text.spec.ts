import { describe, expect, it } from 'vitest';
import { lastTalked, matchesName, nextDateLine, noResults } from './people-text';

describe('matchesName', () => {
  // L2-127 AC3; known gap 101
  it.each([
    ['Femi Bankole', '', true],
    ['Femi Bankole', 'femi', true],
    ['Femi Bankole', 'BANK', true],
    ['Femi Bankole', '  ole ', true],
    ['Tomás Reyes', 'tomas', true],
    ['Femi Bankole', 'Grace', false],
  ])('"%s" with "%s" is %s', (name, search, matches) =>
    expect(matchesName(name, search)).toBe(matches),
  );
});

describe('nextDateLine', () => {
  // L2-126 AC3; known gap 101
  it.each([
    [{ month: 10, day: 7, kind: 'Birthday', title: 'Birthday', inDays: 22 }, 'Oct 7', true],
    [{ month: 4, day: 29, kind: 'Birthday', title: 'Birthday', inDays: 226 }, 'Apr 29', false],
    [{ month: 9, day: 15, kind: 'Birthday', title: 'Birthday', inDays: 30 }, 'Sep 15', true],
  ])('%o reads %s, near %s', (next, date, near) =>
    expect(nextDateLine(next)).toEqual({ date, what: 'Birthday', near }),
  );
});

describe('lastTalked', () => {
  // L2-126 AC3; known gaps 99 and 111
  it.each([
    [null, null, 'Not yet'],
    ['2026-09-15', 0, 'today'],
    ['2026-09-14', 1, 'yesterday'],
    ['2026-09-13', 2, 'Sun'],
    ['2026-09-09', 6, 'Wed'],
    ['2026-09-08', 7, '7 days ago'],
    ['2026-07-18', 59, '59 days ago'],
  ])('on %s, %s days ago, reads "%s"', (on, days, line) => expect(lastTalked(on, days)).toBe(line));
});

describe('noResults', () => {
  it('names what was typed (L2-127 AC3)', () =>
    expect(noResults(' Femi ')).toEqual({
      heading: 'No one called “Femi”',
      text: 'Check the spelling, or add them as someone new.',
      add: 'Add “Femi”',
    }));
});
