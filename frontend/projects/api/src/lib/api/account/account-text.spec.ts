import { describe, expect, it } from 'vitest';
import { hostedLine, initialsOf } from './account-text';

describe('initialsOf', () => {
  it.each([
    ['Mara Okafor', 'MO'],
    ['Joel', 'J'],
    ['  walt  de  brennan ', 'WB'],
    ['', '?'],
    ['   ', '?'],
    ['élodie roux', 'ÉR'],
  ])('"%s" is "%s"', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });
});

describe('hostedLine (L2-049 AC3)', () => {
  it.each([
    [[], null],
    [
      ['Lakeside Weekend'],
      ['You host 1 active Popkin', 'Lakeside Weekend will be wrapped up when your account goes.'],
    ],
    [
      ['Lakeside Weekend', 'Thursday Night Group'],
      [
        'You host 2 active Popkins',
        'Lakeside Weekend and Thursday Night Group will be wrapped up when your account goes.',
      ],
    ],
    [
      ['A', 'B', 'C'],
      ['You host 3 active Popkins', 'A, B and C will be wrapped up when your account goes.'],
    ],
  ])('%j', (names, line) => {
    const said = hostedLine(names as string[]);
    expect(said ? [said.heading, said.text] : null).toEqual(line);
  });
});
