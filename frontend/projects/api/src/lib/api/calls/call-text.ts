/** The most people a call shows at once; the rest are counted (L2-029 AC7). */
export const MOST_SHOWN_ON_CALL = 12;

/** How long a call has run: "0:12", "12:48", "1:02:48" (L2-029 AC5). */
export function callElapsed(startedAt: string, now: Date): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(startedAt).getTime()) / 1000));
  const two = (value: number): string => String(value).padStart(2, '0');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0
    ? `${hours}:${two(minutes)}:${two(seconds % 60)}`
    : `${minutes}:${two(seconds % 60)}`;
}

/** Under the Popkin's name: how many are on the call and how long it has run (L2-029 AC5). */
export function callSubtitle(onCall: number, elapsed: string): string {
  return onCall <= 1 ? `Just you · ${elapsed}` : `${onCall} on the call · ${elapsed}`;
}

/** What the banner of a call under way says after "Group call" (L2-029 AC2). */
export function callBannerText(onCall: number): string {
  return `${onCall} on the call`;
}

/** How the tiles are laid out for a number of them (L2-030 AC1). */
export type CallGridShape = 'solo' | 'pair' | 'four' | 'six';

export function callGrid(tiles: number): CallGridShape {
  if (tiles <= 1) return 'solo';
  if (tiles === 2) return 'pair';
  return tiles <= 4 ? 'four' : 'six';
}

/**
 * Who gets a tile, in the order they joined: everyone up to twelve; from thirteen, eleven
 * people and a count of the rest, so the stage never holds more than twelve tiles. The member
 * is always shown.
 */
export function shownOnCall(
  membershipIds: readonly string[],
  viewerMembershipId: string,
): { shown: string[]; more: number } {
  if (membershipIds.length <= MOST_SHOWN_ON_CALL) return { shown: [...membershipIds], more: 0 };
  const shown = membershipIds.slice(0, MOST_SHOWN_ON_CALL - 1);
  if (membershipIds.includes(viewerMembershipId) && !shown.includes(viewerMembershipId)) {
    shown[shown.length - 1] = viewerMembershipId;
  }
  return { shown, more: membershipIds.length - shown.length };
}

/** Someone's microphone, in words (L2-058 AC12). */
export function micWords(micOn: boolean, speaking: boolean): string {
  if (!micOn) return 'Muted';
  return speaking ? 'Speaking' : 'Microphone on';
}

/** Under the list of who is on the call: who else could join. */
export function othersLine(popkinName: string, members: number, onCall: number): string {
  const others = members - onCall;
  if (others <= 0) return `Everyone in ${popkinName} is on the call.`;
  return `${others} ${others === 1 ? 'other' : 'others'} in ${popkinName} can join anytime.`;
}
