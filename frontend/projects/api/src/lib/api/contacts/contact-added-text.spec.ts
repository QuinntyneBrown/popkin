import { describe, expect, it } from 'vitest';
import { addedCount, addedHeading, addedLine } from './contact-added-text';

describe('contact-added-text', () => {
  it('heads Added with their first name (L2-180 AC1)', () => {
    expect(addedHeading('Femi')).toBe('Femi’s in your contacts');
  });

  it.each([
    ['Friends', 'Grace’s fiancé', 'Friends · Grace’s fiancé'],
    ['Friends', null, 'Friends'],
    ['Friends', '  ', 'Friends'],
    [null, 'Grace’s fiancé', 'Grace’s fiancé'],
  ])('the line of %j and %j is %j (L2-180 AC1)', (circle, knownAs, line) => {
    expect(addedLine(circle, knownAs)).toBe(line);
  });

  it.each([
    [1, null],
    [2, '2 people added today'],
    [3, '3 people added today'],
  ])('a count of %i reads %j (L2-181 AC2)', (count, text) => {
    expect(addedCount(count)).toBe(text);
  });
});
