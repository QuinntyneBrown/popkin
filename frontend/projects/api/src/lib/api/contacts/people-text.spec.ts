import { describe, expect, it } from 'vitest';
import { drifting, lastTalked, matchesName, nextDateLine, noResults } from './people-text';

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
    [{ month: 12, day: 9, kind: 'Birthday', title: 'Birthday', inDays: 85 }, 'Dec 9', true],
    [{ month: 12, day: 14, kind: 'Birthday', title: 'Birthday', inDays: 90 }, 'Dec 14', true],
    [{ month: 12, day: 15, kind: 'Birthday', title: 'Birthday', inDays: 91 }, 'Dec 15', false],
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
    ['2026-09-08', 7, 'Sep 8'],
    ['2026-08-16', 30, 'Aug 16'],
    ['2026-08-15', 31, '31 days ago'],
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

describe('drifting', () => {
  // known gap 99
  it.each([
    [null, false],
    [30, false],
    [31, true],
  ])('%s days is drifting: %s', (days, quiet) => expect(drifting(days)).toBe(quiet));
});
