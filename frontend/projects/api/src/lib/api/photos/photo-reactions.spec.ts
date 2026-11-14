import { describe, expect, it } from 'vitest';
import { applyReactionToggle } from './photo-reactions';

const heart = { emoji: '❤️', count: 9, mine: false };
const eyes = { emoji: '😍', count: 4, mine: false };

describe('applyReactionToggle (L2-034 AC2, AC3)', () => {
  it.each([
    [
      'adds the member’s reaction to a chip others gave',
      [heart, eyes],
      '❤️',
      [{ ...heart, count: 10, mine: true }, eyes],
    ],
    [
      'takes the member’s reaction back',
      [{ ...heart, count: 10, mine: true }, eyes],
      '❤️',
      [heart, eyes],
    ],
    ['adds a new chip at the end', [heart], '🔥', [heart, { emoji: '🔥', count: 1, mine: true }]],
    [
      'drops a chip that reaches nothing',
      [heart, { emoji: '🔥', count: 1, mine: true }],
      '🔥',
      [heart],
    ],
    ['starts from no reactions', [], '👏', [{ emoji: '👏', count: 1, mine: true }]],
  ])('%s', (_case, reactions, emoji, after) => {
    expect(applyReactionToggle(reactions, emoji)).toEqual(after);
  });

  it('leaves the list it was given as it was', () => {
    const reactions = [heart];
    applyReactionToggle(reactions, '❤️');
    expect(reactions).toEqual([heart]);
  });
});
