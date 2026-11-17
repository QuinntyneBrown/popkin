import { ContactCircle } from '../../models/contacts';
import { ConnectionKindName } from '../../models/connections';
import { ConnectionKind } from './connection-map';

/** The panel with no face chosen (L2-149 AC2). */
export const CONNECTIONS_HINT = 'Tap anyone to see their people';
export const CONNECTIONS_LEGEND =
  'Lines show how people know each other: coral for family, green for friends, a dashed grey line for work. Dotted means an introduction you’ve promised.';

/** The kind as the map draws it. */
export function lineKind(kind: ConnectionKindName): ConnectionKind {
  return kind.toLowerCase() as ConnectionKind;
}

/** The line from "You" to a contact, by their circle; none without one (L2-149 AC6). */
export function lineToYou(circle: ContactCircle | null): ConnectionKind | null {
  if (circle === null) return null;
  if (circle === 'Family') return 'family';
  if (circle === 'Work') return 'work';
  return 'friend';
}

/** "Connect Chidi to…", or "Connect two people" with nobody chosen yet (L2-150 AC1, AC7). */
export function connectTitle(firstName: string | null): string {
  return firstName ? `Connect ${firstName} to…` : 'Connect two people';
}

/** The summary's line with nobody chosen in "Who" (L2-150 AC2). */
export function connectWhoSummary(firstName: string | null): string {
  return firstName
    ? `Who: pick who ${firstName} is connected to.`
    : 'Who: pick who they’re connected to.';
}

/** The list's own error with nobody chosen in "Who" (L2-150 AC2). */
export function connectWhoError(firstName: string | null): string {
  return firstName ? `Pick who ${firstName} is connected to.` : 'Pick who they’re connected to.';
}

/** The summary's line with nobody chosen in "Connect", from the empty map (L2-150 AC7). */
export const CONNECT_FIRST_SUMMARY = 'Connect: choose the first person.';
export const CONNECT_FIRST_ERROR = 'Choose the first person.';

/** "In your words" over 60 characters (L2-150 AC10). */
export const CONNECT_WORDS_SUMMARY = 'In your words: keep it to 60 characters.';
export const CONNECT_WORDS_ERROR = 'Keep it to 60 characters.';
export const CONNECT_WORDS_MAX = 60;

/** A search that matches nobody (L2-150 AC3). */
export function connectNoResults(
  query: string,
  firstName: string | null,
): { heading: string; text: string; add: string } {
  return {
    heading: `No one called “${query}” in your contacts`,
    text: firstName
      ? `Add them first, then connect them to ${firstName}.`
      : 'Add them first, then connect them.',
    add: `Add “${query}”`,
  };
}

/** A connection's line on a panel or profile: its words, else its kind (L2-149 AC7). */
export function connectionWords(words: string | null, kind: ConnectionKindName): string {
  return words ?? kind;
}

/** The control that removes a connection in Add someone or Edit (L2-150 AC9). */
export function removeConnectionLabel(firstName: string): string {
  return `Remove the connection to ${firstName}`;
}
