/** One emoji given to a photo: how many gave it, and whether the member did. */
export interface PhotoReaction {
  emoji: string;
  count: number;
  mine: boolean;
}

/**
 * The reactions after the member presses one (L2-034 AC2, AC3): their own is taken back, and a
 * chip that reaches nothing goes; otherwise one more, marked as theirs, a new emoji at the end.
 */
export function applyReactionToggle(
  reactions: readonly PhotoReaction[],
  emoji: string,
): PhotoReaction[] {
  const given = reactions.find((reaction) => reaction.emoji === emoji);
  if (!given) return [...reactions, { emoji, count: 1, mine: true }];
  return reactions
    .map((reaction) =>
      reaction !== given
        ? reaction
        : given.mine
          ? { ...given, count: given.count - 1, mine: false }
          : { ...given, count: given.count + 1, mine: true },
    )
    .filter((reaction) => reaction.count > 0);
}
