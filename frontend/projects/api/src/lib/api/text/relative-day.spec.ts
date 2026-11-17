import { describe, expect, it } from 'vitest';
import { capitalised, daysAway } from './relative-day';

describe('relative days', () => {
  it('says today, tomorrow, or in how many days', () => {
    expect(daysAway(0)).toBe('today');
    expect(daysAway(1)).toBe('tomorrow');
    expect(daysAway(4)).toBe('in 4 days');
  });

  it('starts a line with a capital', () => {
    expect(capitalised(daysAway(1))).toBe('Tomorrow');
    expect(capitalised('')).toBe('');
  });
});
