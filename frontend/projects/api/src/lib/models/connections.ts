import { ContactCircle } from './contacts';

/** How two contacts know each other, as the API names it (L2-150). */
export type ConnectionKindName = 'Family' | 'Partner' | 'Friend' | 'Work';

/** The kinds in the order Connect offers them. */
export const CONNECTION_KINDS: readonly ConnectionKindName[] = [
  'Family',
  'Partner',
  'Friend',
  'Work',
];

/** A face on the map (L2-149 AC1, AC6). */
export interface MapPersonView {
  contactId: string;
  firstName: string;
  fullName: string;
  initials: string;
  /** The contact's colour as the API names it: "Sky". */
  accent: string;
  photoUrl: string | null;
  knownAs: string | null;
  circle: ContactCircle | null;
}

/** A line between two faces, the pair smaller id first. */
export interface ConnectionView {
  id: string;
  contactId: string;
  otherContactId: string;
  kind: ConnectionKindName;
  words: string | null;
  /** An introduction promised and not made yet: a dotted line (L2-150 AC6). */
  promised: boolean;
}

/** Connections: the faces in the order they were first connected, and the lines. */
export interface ConnectionsView {
  people: MapPersonView[];
  connections: ConnectionView[];
}

/** "People around {first name}" on a profile (L2-150 AC4). */
export interface AroundView {
  id: string;
  contactId: string;
  name: string;
  initials: string;
  accent: string;
  photoUrl: string | null;
  kind: ConnectionKindName;
  words: string | null;
  promised: boolean;
}

/** "Connect": nobody chosen is `null`, which the API refuses as `who_required`. */
export interface ConnectRequest {
  clientId: string;
  contactId: string;
  otherContactId: string | null;
  kind: ConnectionKindName;
  words: string | null;
  promised: boolean;
}

/** A connection chosen in Connect from Add someone or Edit, saved with the contact (L2-150 AC9). */
export interface ConnectionDraft {
  otherContactId: string;
  kind: ConnectionKindName;
  words: string | null;
  promised: boolean;
}
