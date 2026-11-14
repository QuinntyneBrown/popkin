import { MORE_REACTIONS, QUICK_REACTIONS, reactionChips, reactionName } from './reactions';

describe('the reactions', () => {
  it('offers five quick reactions, as L2-024 AC1 asks', () => {
    expect(QUICK_REACTIONS.map((r) => r.emoji)).toEqual(['❤️', '😂', '😍', '🔥', '👏']);
  });

  it('offers twelve more, none of them quick ones', () => {
    expect(MORE_REACTIONS).toHaveLength(12);
    expect(MORE_REACTIONS.map((r) => r.emoji)).toContain('🥞');
    for (const quick of QUICK_REACTIONS) expect(MORE_REACTIONS).not.toContainEqual(quick);
  });

  it.each([
    ['❤️', 'Heart'],
    ['😂', 'Laughing'],
    ['😍', 'Heart eyes'],
    ['🔥', 'Fire'],
    ['👏', 'Clapping'],
    ['👍', 'Thumbs up'],
    ['🙌', 'Raised hands'],
    ['🎉', 'Party popper'],
    ['🥳', 'Partying face'],
    ['😮', 'Surprised'],
    ['😢', 'Crying'],
    ['🙏', 'Praying hands'],
    ['💯', 'Hundred'],
    ['😎', 'Sunglasses'],
    ['🤔', 'Thinking'],
    ['🥞', 'Pancakes'],
    ['☕', 'Coffee'],
    ['🦆', '🦆'],
  ])('names %s "%s"', (emoji, name) => {
    expect(reactionName(emoji)).toBe(name);
  });
});

describe('the chips of a message', () => {
  const chips = (reactions: { emoji: string; membershipIds: string[] }[]) =>
    reactionChips(reactions, 'm-mara');

  it('shows each emoji with its count, in the order they were first chosen', () => {
    expect(
      chips([
        { emoji: '🥞', membershipIds: ['m-walt', 'm-ellie'] },
        { emoji: '❤️', membershipIds: ['m-ruth'] },
      ]).map(({ emoji, count }) => [emoji, count]),
    ).toEqual([
      ['🥞', 2],
      ['❤️', 1],
    ]);
  });

  it('marks the member’s own reaction, and says so to assistive technology (L2-024 AC2, AC5)', () => {
    const [heart, pancakes] = chips([
      { emoji: '❤️', membershipIds: ['m-walt', 'm-mara', 'm-ruth'] },
      { emoji: '🥞', membershipIds: ['m-walt'] },
    ]);
    expect(heart).toMatchObject({ mine: true, label: 'Heart, you reacted, 3' });
    expect(pancakes).toMatchObject({ mine: false, label: 'Pancakes, 1' });
  });

  it('leaves out an emoji nobody chose any more', () => {
    expect(chips([{ emoji: '🔥', membershipIds: [] }])).toEqual([]);
  });
});
