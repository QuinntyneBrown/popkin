import { ConnectionsView, MapPersonView } from '../../models/connections';
import { ConnectionKind, ConnectionLink, ConnectionPerson } from './connection-map';
import { connectionWords, lineKind, lineToYou } from './connections-text';

/** How far from the middle the faces sit, as a fraction of the map's width and height. */
const RADIUS = 0.4;

/**
 * Where each face sits (known gap 109, ruled): evenly round an oval from the top, clockwise, in
 * the order the map lists them, which is the order they were first connected.
 */
export function placeFaces(ids: readonly string[]): ConnectionPerson[] {
  const n = ids.length;
  return ids.map((id, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return {
      id,
      x: Math.round((0.5 + RADIUS * Math.cos(angle)) * 1000) / 1000,
      y: Math.round((0.5 + RADIUS * Math.sin(angle)) * 1000) / 1000,
    };
  });
}

/** The lines: "You" to each face with a circle, then each connection (L2-149 AC6). */
export function mapLinks(map: ConnectionsView): ConnectionLink[] {
  const toYou = map.people.flatMap((p): ConnectionLink[] => {
    const kind = lineToYou(p.circle);
    return kind ? [{ a: 'you', b: p.contactId, kind }] : [];
  });
  const between = map.connections.map((c): ConnectionLink => ({
    a: c.contactId,
    b: c.otherContactId,
    kind: lineKind(c.kind),
    pending: c.promised,
  }));
  return [...toYou, ...between];
}

/** A row of the panel for a chosen face (L2-149 AC3, AC7). */
export interface PanelRow {
  /** The contact at the other end; null for "You". */
  contactId: string | null;
  name: string;
  initials: string;
  accent: string;
  photoUrl: string | null;
  kind: ConnectionKind;
  meta: string;
}

/**
 * The chosen face's connections: "You" first when they have a circle, reading how the person
 * knows them (Known as, else the circle), then each connection in its words, else its kind.
 */
export function panelRows(
  map: ConnectionsView,
  chosen: MapPersonView,
  you: { photoUrl: string | null; accent: string },
): PanelRow[] {
  const people = new Map(map.people.map((p) => [p.contactId, p]));
  const toYou = lineToYou(chosen.circle);
  const rows: PanelRow[] = toYou
    ? [
        {
          contactId: null,
          name: 'You',
          initials: '',
          accent: you.accent,
          photoUrl: you.photoUrl,
          kind: toYou,
          meta: chosen.knownAs ?? chosen.circle ?? '',
        },
      ]
    : [];
  for (const c of map.connections) {
    if (c.contactId !== chosen.contactId && c.otherContactId !== chosen.contactId) continue;
    const other = people.get(c.contactId === chosen.contactId ? c.otherContactId : c.contactId);
    if (!other) continue;
    rows.push({
      contactId: other.contactId,
      name: other.fullName,
      initials: other.initials,
      accent: other.accent.toLowerCase(),
      photoUrl: other.photoUrl,
      kind: lineKind(c.kind),
      meta: connectionWords(c.words, c.kind),
    });
  }
  return rows;
}
