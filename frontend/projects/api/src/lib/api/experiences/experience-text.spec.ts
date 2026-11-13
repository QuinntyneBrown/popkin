import { describe, expect, it } from 'vitest';
import {
  averageText,
  byline,
  filterOf,
  intro,
  kindLabel,
  nothingHere,
  ratingsText,
  scoreBars,
  starName,
  starsLabel,
} from './experience-text';

const sep12 = new Date(2026, 8, 12, 7, 0).toISOString();

describe('kindLabel', () => {
  it.each([
    ['Did', 'Something we did'],
    ['Restaurant', 'Restaurant'],
    ['Want', 'Want to do'],
  ] as const)('%s reads "%s"', (kind, label) => expect(kindLabel(kind)).toBe(label));
});

describe('byline', () => {
  it.each([
    ['Did', 'Sat morning', 'Mara · Sat morning'],
    ['Restaurant', ' Fri night ', 'Mara · Fri night'],
    ['Did', null, 'Mara · Sep 12'],
    ['Restaurant', '  ', 'Mara · Sep 12'],
    ['Want', null, 'Mara · Idea'],
    ['Want', 'Next summer', 'Mara · Next summer'],
  ] as const)('%s shared with when %j reads "%s"', (kind, when, text) =>
    expect(byline({ kind, when, sharedAt: sep12, sharedBy: { firstName: 'Mara' } })).toBe(text),
  );
});

describe('intro', () => {
  it.each([
    ['Did', 'Sat morning', 'Something we did · Sat morning'],
    ['Restaurant', null, 'Restaurant'],
    ['Want', '', 'Want to do'],
  ] as const)('%s with when %j reads "%s"', (kind, when, text) =>
    expect(intro({ kind, when })).toBe(text),
  );
});

describe('averageText', () => {
  it.each([
    [4.8, '4.8'],
    [5, '5.0'],
    [4.25, '4.3'],
    [1, '1.0'],
    [null, ''],
  ])('%j reads "%s"', (average, text) => expect(averageText(average)).toBe(text));
});

describe('ratingsText', () => {
  it.each([
    [0, 'No ratings yet'],
    [1, '1 rating'],
    [11, '11 ratings'],
  ])('%i reads "%s"', (count, text) => expect(ratingsText(count)).toBe(text));
});

describe('starsLabel', () => {
  it.each([
    [4.8, '4.8 out of 5'],
    [5, '5 out of 5'],
    [3, '3 out of 5'],
    [null, 'No ratings yet'],
  ])('%j reads "%s"', (value, text) => expect(starsLabel(value)).toBe(text));
});

describe('starName', () => {
  it.each([
    [1, '1 star'],
    [2, '2 stars'],
    [5, '5 stars'],
  ])('%i is named "%s"', (stars, name) => expect(starName(stars)).toBe(name));
});

describe('scoreBars', () => {
  const counts = (...values: number[]) => values.map((count, i) => ({ stars: 5 - i, count }));

  it('scales each bar to the largest count, as the mock draws them', () => {
    expect(scoreBars(counts(9, 1, 1, 0, 0))).toEqual([
      { stars: 5, percent: 100, text: '5 stars: 9 ratings' },
      { stars: 4, percent: 11, text: '4 stars: 1 rating' },
      { stars: 3, percent: 11, text: '3 stars: 1 rating' },
      { stars: 2, percent: 0, text: '2 stars: 0 ratings' },
      { stars: 1, percent: 0, text: '1 star: 0 ratings' },
    ]);
  });

  it('draws no bar when nobody has rated', () => {
    expect(scoreBars(counts(0, 0, 0, 0, 0)).map((bar) => bar.percent)).toEqual([0, 0, 0, 0, 0]);
  });

  it('has five bars, five stars first, whatever order and gaps the answer has', () => {
    const bars = scoreBars([
      { stars: 1, count: 2 },
      { stars: 5, count: 4 },
    ]);
    expect(bars.map((bar) => [bar.stars, bar.percent])).toEqual([
      [5, 100],
      [4, 0],
      [3, 0],
      [2, 0],
      [1, 50],
    ]);
  });
});

describe('filterOf', () => {
  it.each([
    ['did', 'did'],
    ['want', 'want'],
    ['all', 'all'],
    [null, 'all'],
    ['', 'all'],
    ['keen', 'all'],
  ])('the query %j is the filter %s', (query, filter) => expect(filterOf(query)).toBe(filter));
});

describe('nothingHere', () => {
  it('explains experiences when the Popkin has none', () => {
    expect(nothingHere('all')).toEqual({
      heading: 'Nothing shared yet',
      text: 'Experiences are the things your group did, the places you ate and the ideas for next time. Share one and everyone can rate it.',
    });
  });

  it('says the wish list is empty', () => {
    expect(nothingHere('want')).toEqual({
      heading: 'Nothing on the wish list',
      text: 'Got an idea for next time? Put it here and see who’s keen.',
    });
  });

  it('says nothing was done yet', () => {
    expect(nothingHere('did').heading).toBe('Nothing done yet');
  });
});
