import { describe, expect, it } from 'vitest';
import { HoursDay, dayError, stretchesOf } from './my-hours';

const day = (...stretches: [string, string][]): HoursDay => ({
  name: 'Thu 17',
  weekday: 'Thursday',
  stretches: stretches.map(([start, end]) => ({ start, end })),
});

describe('dayError', () => {
  // L2-074 AC8: up to two stretches on the quarter hour, each ending after it starts.
  it.each([
    [day(), null],
    [day(['', '']), null],
    [day(['09:00', '17:30']), null],
    [day(['18:00', '00:00']), null], // midnight at the end
    [day(['06:00', '10:00'], ['18:00', '00:00']), null],
    [day(['09:00', '08:00']), 'Thursday ends before it starts.'],
    [day(['09:00', '09:00']), 'Thursday ends before it starts.'],
    [day(['09:00', '']), 'Thursday needs a start and an end.'],
    [day(['', '17:00']), 'Thursday needs a start and an end.'],
    [day(['09:10', '17:00']), 'Thursday’s times are on the quarter hour.'],
    [
      day(['06:00', '10:00'], ['09:00', '14:00']),
      'Thursday’s second stretch starts before the first ends.',
    ],
    [day(['06:00', '10:00'], ['', '']), null],
  ])('%j is %s', (hours, error) => expect(dayError(hours)).toBe(error));
});

describe('stretchesOf', () => {
  it('sends the filled stretches, midnight at the end as "24:00"', () =>
    expect(stretchesOf(day(['06:00', '10:00'], ['18:00', '00:00']))).toEqual([
      { start: '06:00', end: '10:00' },
      { start: '18:00', end: '24:00' },
    ]));

  it('sends nothing for a blank day', () =>
    expect(stretchesOf(day(['', ''], ['', '']))).toEqual([]));
});
