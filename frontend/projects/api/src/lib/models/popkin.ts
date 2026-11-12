/** The seven colours a Popkin carries (L1 Terms). */
export const POPKIN_COLOURS = ['Coral', 'Teal', 'Sky', 'Berry', 'Leaf', 'Plum', 'Amber'] as const;
export type PopkinColour = (typeof POPKIN_COLOURS)[number];

/** The twelve emoji a Popkin can take, with the names assistive technology reads (L2-008 AC1). */
export const POPKIN_EMOJI = [
  { emoji: '🏕️', label: 'Camping' },
  { emoji: '🙏', label: 'Praying hands' },
  { emoji: '☕', label: 'Coffee' },
  { emoji: '💻', label: 'Laptop' },
  { emoji: '⚽', label: 'Football' },
  { emoji: '🎸', label: 'Guitar' },
  { emoji: '🌻', label: 'Sunflower' },
  { emoji: '🏖️', label: 'Beach' },
  { emoji: '🍲', label: 'Pot of food' },
  { emoji: '🧶', label: 'Yarn' },
  { emoji: '📚', label: 'Books' },
  { emoji: '🎉', label: 'Party popper' },
] as const;

export const POPKIN_NAME_MAX = 40;

/** How long a Popkin lasts (L2-009). */
export type PopkinLength = 'JustToday' | 'TheWeekend' | 'UntilDate' | 'KeepItGoing';

/** The `data-accent` value of a colour. */
export function accentOf(colour: PopkinColour): string {
  return colour.toLowerCase();
}
