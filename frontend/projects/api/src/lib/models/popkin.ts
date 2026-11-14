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

/** The four lengths a Popkin can take, as starting it and changing it offer them (L2-009 AC1). */
export const POPKIN_LENGTHS: readonly {
  value: PopkinLength;
  icon: string;
  title: string;
  sub: string;
}[] = [
  { value: 'JustToday', icon: '☀️', title: 'Just today', sub: 'Wraps up at midnight' },
  { value: 'TheWeekend', icon: '⛺', title: 'The weekend', sub: 'Wraps up Sunday, 6 pm' },
  { value: 'UntilDate', icon: '📅', title: 'Until a date', sub: 'You pick when it ends' },
  {
    value: 'KeepItGoing',
    icon: '🌱',
    title: 'Keep it going',
    sub: 'No end date. Wrap up whenever.',
  },
];

/** The `data-accent` value of a colour. */
export function accentOf(colour: PopkinColour): string {
  return colour.toLowerCase();
}

export interface CreatePopkinRequest {
  name: string;
  emoji: string;
  colour: PopkinColour;
  length: PopkinLength;
  /** ISO date-time; null when it keeps going. */
  endsAt: string | null;
}

/**
 * A Popkin's settings as its Host last saved them: the answer to a change and what
 * `PopkinChanged` carries (L2-020 AC3, AC4). A higher version replaces a lower one.
 */
export interface PopkinSettingsView {
  id: string;
  name: string;
  emoji: string;
  colour: PopkinColour;
  length: PopkinLength;
  /** ISO date-time; null when it keeps going. */
  endsAt: string | null;
  version: number;
}

export interface ChangeLookRequest {
  name: string;
  emoji: string;
  colour: PopkinColour;
}

export interface ChangeLengthRequest {
  length: PopkinLength;
  /** ISO date-time, resolved on the device; null when it keeps going. */
  endsAt: string | null;
}

export interface PopkinCreatedView {
  id: string;
  name: string;
  emoji: string;
  colour: PopkinColour;
  endsAt: string | null;
  inviteCode: string;
  inviteUrl: string;
}

/** A Popkin's invite: the code, the link the QR code encodes, and the Popkin's look (L2-011). */
export interface InviteView {
  code: string;
  url: string;
  popkinName: string;
  emoji: string;
  colour: PopkinColour;
}
