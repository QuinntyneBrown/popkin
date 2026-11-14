import { ReactionSummary } from '../../models/chat';

/** An emoji a member can react with, and the name assistive technology reads for it. */
export interface Reaction {
  emoji: string;
  name: string;
}

/** A reaction chip under a message, as its screen draws it (L2-024 AC2, AC5). */
export interface ReactionChip {
  emoji: string;
  name: string;
  count: number;
  /** The member chose it: the chip is pressed, outlined and tinted. */
  mine: boolean;
  /** What assistive technology reads: "Heart, you reacted, 3". */
  label: string;
}

/** The five offered first in message actions (L2-024 AC1). */
export const QUICK_REACTIONS: readonly Reaction[] = [
  { emoji: '❤️', name: 'Heart' },
  { emoji: '😂', name: 'Laughing' },
  { emoji: '😍', name: 'Heart eyes' },
  { emoji: '🔥', name: 'Fire' },
  { emoji: '👏', name: 'Clapping' },
];

/** The twelve behind "More reactions". */
export const MORE_REACTIONS: readonly Reaction[] = [
  { emoji: '👍', name: 'Thumbs up' },
  { emoji: '🙌', name: 'Raised hands' },
  { emoji: '🎉', name: 'Party popper' },
  { emoji: '🥳', name: 'Partying face' },
  { emoji: '😮', name: 'Surprised' },
  { emoji: '😢', name: 'Crying' },
  { emoji: '🙏', name: 'Praying hands' },
  { emoji: '💯', name: 'Hundred' },
  { emoji: '😎', name: 'Sunglasses' },
  { emoji: '🤔', name: 'Thinking' },
  { emoji: '🥞', name: 'Pancakes' },
  { emoji: '☕', name: 'Coffee' },
];

const NAMES = new Map([...QUICK_REACTIONS, ...MORE_REACTIONS].map((r) => [r.emoji, r.name]));

/** The emoji's name; one Popkin does not offer is named by itself. */
export function reactionName(emoji: string): string {
  return NAMES.get(emoji) ?? emoji;
}

/** A message's reactions as chips, in the order the server gives them, those at zero left out. */
export function reactionChips(
  reactions: readonly ReactionSummary[],
  viewerMembershipId: string,
): ReactionChip[] {
  return reactions
    .filter((reaction) => reaction.membershipIds.length > 0)
    .map(({ emoji, membershipIds }) => {
      const name = reactionName(emoji);
      const count = membershipIds.length;
      const mine = membershipIds.includes(viewerMembershipId);
      const label = mine ? `${name}, you reacted, ${count}` : `${name}, ${count}`;
      return { emoji, name, count, mine, label };
    });
}
