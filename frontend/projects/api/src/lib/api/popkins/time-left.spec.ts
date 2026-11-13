import { describe, expect, it } from 'vitest';
import { timeLeft } from './time-left';

const now = new Date(2026, 8, 12, 12, 0);
const after = (days: number, hours: number, minutes: number, seconds = 0) =>
  new Date(now.getTime() + (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000);

describe('timeLeft (L2-044 AC5: the largest two units)', () => {
  it.each([
    [after(1, 6, 0), '1 day 6 hrs left'],
    [after(1, 6, 59), '1 day 6 hrs left'],
    [after(2, 1, 0), '2 days 1 hr left'],
    [after(3, 0, 20), '3 days left'],
    [after(0, 5, 30), '5 hrs 30 min left'],
    [after(0, 1, 0), '1 hr left'],
    [after(0, 0, 42), '42 min left'],
    [after(0, 0, 0, 30), '1 min left'],
    [after(0, 0, 0), null],
    [after(0, 0, -5), null],
  ])('%s reads %s', (endsAt, text) => {
    expect(timeLeft(endsAt, now)).toBe(text);
  });
});
