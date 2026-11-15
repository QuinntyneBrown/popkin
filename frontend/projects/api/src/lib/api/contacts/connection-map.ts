export type ConnectionKind = 'family' | 'partner' | 'friend' | 'work';

/** Which links the map shows: all, or one kind; `family` shows partners too. */
export type ConnectionFilter = 'all' | 'family' | 'friend' | 'work';

/** A person on the map, placed by fractions of its width and height (0 to 1). */
export interface ConnectionPerson {
  id: string;
  x: number;
  y: number;
}

/** A link between two people; `you` is the member in the middle of the map. */
export interface ConnectionLink {
  a: string;
  b: string;
  kind: ConnectionKind;
  /** Waiting for the other person to agree. */
  pending?: boolean;
}

export interface ConnectionLine {
  key: string;
  kind: ConnectionKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pending: boolean;
  /** A link of the chosen person. */
  on: boolean;
  /** Not a link of the chosen person. */
  dim: boolean;
}

export interface ConnectionMapView {
  lines: ConnectionLine[];
  /** The people dimmed because they are neither the chosen person nor linked to them. */
  dim: Set<string>;
}

/** The map's box, in the units of its lines' viewBox. */
const WIDTH = 1000;
const HEIGHT = 680;
const YOU = 'you';

/**
 * The connection map (docs/design-system/components/connection-map.html): a line for every link
 * the filter keeps, from face to face, with you in the middle. Choosing a person lights their
 * links and dims every other link and every person not linked to them; the filter only hides
 * lines, never faces.
 */
export function connectionMapOf(
  people: readonly ConnectionPerson[],
  links: readonly ConnectionLink[],
  focus: string | null,
  filter: ConnectionFilter,
): ConnectionMapView {
  const at = new Map(people.map((p) => [p.id, p]));
  at.set(YOU, { id: YOU, x: 0.5, y: 0.5 });
  const kept = links.filter((l) => shows(filter, l.kind) && at.has(l.a) && at.has(l.b));
  const touches = (l: ConnectionLink) => focus !== null && (l.a === focus || l.b === focus);

  const lines = kept.map((l) => {
    const a = at.get(l.a)!;
    const b = at.get(l.b)!;
    return {
      key: `${l.a}-${l.b}`,
      kind: l.kind,
      x1: round(a.x * WIDTH),
      y1: round(a.y * HEIGHT),
      x2: round(b.x * WIDTH),
      y2: round(b.y * HEIGHT),
      pending: !!l.pending,
      on: touches(l),
      dim: focus !== null && !touches(l),
    };
  });

  const dim = new Set<string>();
  if (focus !== null) {
    const near = new Set(kept.filter(touches).flatMap((l) => [l.a, l.b]));
    for (const p of people) if (p.id !== focus && !near.has(p.id)) dim.add(p.id);
  }
  return { lines, dim };
}

function shows(filter: ConnectionFilter, kind: ConnectionKind): boolean {
  if (filter === 'all') return true;
  if (filter === 'family') return kind === 'family' || kind === 'partner';
  return kind === filter;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
