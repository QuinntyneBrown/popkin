/**
 * The events `PopkinHub` sends, by the names the server gives them. `SignalRPopkinRealtime`
 * alone reads this map; a renamed event is changed here and nowhere else.
 */
export const HUB_URL = '/hubs/popkin';

export const HUB_EVENTS = {
  messageAdded: 'MessageAdded',
  messageDeleted: 'MessageDeleted',
  threadRead: 'ThreadRead',
  presenceChanged: 'PresenceChanged',
  memberJoined: 'MemberJoined',
  photosAdded: 'PhotosAdded',
  callChanged: 'CallChanged',
  callEnded: 'CallEnded',
  participantJoined: 'ParticipantJoined',
  participantLeft: 'ParticipantLeft',
  participantMediaChanged: 'ParticipantMediaChanged',
  signal: 'Signal',
  popkinWrappedUp: 'PopkinWrappedUp',
} as const;

/** What the app asks of `PopkinHub`, by the names the server gives its methods. */
export const HUB_METHODS = {
  joinCall: 'JoinCall',
  sendSignal: 'SendSignal',
} as const;

/** The waits before each try to reconnect; after the last, every 30 seconds without limit. */
export const RECONNECT_DELAYS_MS = [0, 2_000, 10_000, 30_000] as const;

export function reconnectDelay(previousTries: number): number {
  return RECONNECT_DELAYS_MS[Math.min(previousTries, RECONNECT_DELAYS_MS.length - 1)];
}
