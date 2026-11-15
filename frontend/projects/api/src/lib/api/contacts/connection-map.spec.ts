import { describe, expect, it } from 'vitest';
import { ConnectionLink, ConnectionPerson, connectionMapOf } from './connection-map';

/** Part of the mocks' map: you in the middle, Ada and Chidi family, Tomás Chidi's partner, Grace a friend. */
const people: ConnectionPerson[] = [
  { id: 'ada', x: 0.27, y: 0.279 },
  { id: 'chidi', x: 0.33, y: 0.103 },
  { id: 'tomas', x: 0.15, y: 0.118 },
  { id: 'grace', x: 0.73, y: 0.25 },
];
const links: ConnectionLink[] = [
  { a: 'you', b: 'ada', kind: 'family' },
  { a: 'you', b: 'chidi', kind: 'family' },
  { a: 'chidi', b: 'tomas', kind: 'partner' },
  { a: 'you', b: 'grace', kind: 'friend', pending: true },
];

describe('connectionMapOf (docs/design-system/components/connection-map.html)', () => {
  it('draws every link from face to face in the 1000 × 680 box, neither on nor dim', () => {
    const map = connectionMapOf(people, links, null, 'all');

    expect(map.lines[0]).toEqual({
      key: 'you-ada',
      kind: 'family',
      x1: 500,
      y1: 340,
      x2: 270,
      y2: 189.7,
      pending: false,
      on: false,
      dim: false,
    });
    expect(map.lines.some((l) => l.on || l.dim)).toBe(false);
    expect(map.dim.size).toBe(0);
  });

  it('with a person chosen, lights their links and dims every other link and person', () => {
    const map = connectionMapOf(people, links, 'chidi', 'all');

    expect(map.lines.map((l) => [l.key, l.on, l.dim])).toEqual([
      ['you-ada', false, true],
      ['you-chidi', true, false],
      ['chidi-tomas', true, false],
      ['you-grace', false, true],
    ]);
    expect([...map.dim].sort()).toEqual(['ada', 'grace']);
  });

  it('dashes a link still waiting for the other person to agree', () => {
    const map = connectionMapOf(people, links, null, 'all');

    expect(map.lines.filter((l) => l.pending).map((l) => l.key)).toEqual(['you-grace']);
  });

  it('shows only family and partners under Family, and every face still', () => {
    const map = connectionMapOf(people, links, null, 'family');

    expect(map.lines.map((l) => l.key)).toEqual(['you-ada', 'you-chidi', 'chidi-tomas']);
    expect(map.dim.size).toBe(0);
  });

  it('shows only that kind under Friends or Work', () => {
    expect(connectionMapOf(people, links, null, 'friend').lines.map((l) => l.key)).toEqual([
      'you-grace',
    ]);
    expect(connectionMapOf(people, links, null, 'work').lines).toEqual([]);
  });
});
