import { describe, expect, it } from 'vitest';
import { andMore, hereUntil, peopleCount, welcomeLine, wrappedUpLine } from './invite-text';

// Saturday 12 September 2026, noon on the device: the day the mocks show.
const now = new Date(2026, 8, 12, 12, 0);

describe('hereUntil', () => {
  it.each([
    [new Date(2026, 8, 13, 18, 0), 'Here until Sunday, 6 pm'],
    [new Date(2026, 8, 12, 23, 30), 'Here until today, 11:30 pm'],
    [new Date(2026, 8, 13, 0, 0), 'Here until Sunday, 12 am'],
    [new Date(2026, 8, 18, 12, 0), 'Here until Friday, 12 pm'],
    [new Date(2026, 8, 19, 9, 5), 'Here until 19 Sep, 9:05 am'],
    [new Date(2027, 0, 2, 18, 0), 'Here until 2 Jan 2027, 6 pm'],
  ])('%s reads "%s"', (endsAt, text) => {
    expect(hereUntil(endsAt, now)).toBe(text);
  });
});

describe('wrappedUpLine', () => {
  it.each([
    [new Date(2026, 8, 12, 9, 0), 'This Popkin wrapped up today.'],
    [new Date(2026, 8, 6, 18, 0), 'This Popkin wrapped up on Sunday.'],
    [new Date(2026, 8, 5, 18, 0), 'This Popkin wrapped up on 5 Sep.'],
    [new Date(2025, 11, 31, 18, 0), 'This Popkin wrapped up on 31 Dec 2025.'],
  ])('%s reads "%s … Ask Mara for the next one."', (wrappedUpAt, start) => {
    expect(wrappedUpLine(wrappedUpAt, 'Mara', now)).toBe(
      `${start} What a time. Ask Mara for the next one.`,
    );
  });
});

describe('peopleCount', () => {
  it.each([
    [1, '1 person'],
    [2, '2 people'],
    [14, '14 people'],
  ])('%i is "%s"', (count, text) => {
    expect(peopleCount(count)).toBe(text);
  });
});

describe('welcomeLine', () => {
  it.each([
    [[], 0, 'You’re now part of Lakeside Weekend.'],
    [['Mara'], 0, 'You’re now part of Lakeside Weekend, with Mara.'],
    [['Mara', 'Walt'], 0, 'You’re now part of Lakeside Weekend, with Mara and Walt.'],
    [['Mara', 'Walt'], 1, 'You’re now part of Lakeside Weekend, with Mara, Walt and 1 other.'],
    [['Mara', 'Walt'], 12, 'You’re now part of Lakeside Weekend, with Mara, Walt and 12 others.'],
  ])('%j and %i others', (named, others, text) => {
    expect(welcomeLine('Lakeside Weekend', named, others)).toBe(text);
  });
});

describe('andMore', () => {
  it.each([
    [0, null],
    [1, 'and 1 more'],
    [6, 'and 6 more'],
  ])('%i is %j', (count, text) => {
    expect(andMore(count)).toBe(text);
  });
});
