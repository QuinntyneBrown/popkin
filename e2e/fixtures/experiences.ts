import path from 'node:path';
import type { Page, Route } from '@playwright/test';
import { people, popkinId } from './chat';
import type { Home } from './home';
import { homeNow, maraAtHome } from './home';
import { problem } from './stubs';

/**
 * The experiences of Lakeside Weekend as the mocks draw them, answered in memory (ADR 0005):
 * the list under each filter, each experience with its score and comments, and rating,
 * commenting, sharing, editing and deleting, each of which a spec can hold, fail or refuse.
 */
export const experiencesUrl = `/p/${popkinId}/experiences`;
export const experienceUrl = (id: string) => `${experiencesUrl}/${id}`;

const images = path.join(__dirname, '../../docs/mocks/assets/images');

interface Person {
  membershipId: string;
  firstName: string;
  avatar: { initials: string; accent: string; photoUrl: string | null };
}

/** Sam, who shared the taqueria, has no photo: the mock draws their initials. */
export const sam: Person = {
  membershipId: '00000000-0000-4000-8000-sam000000000',
  firstName: 'Sam',
  avatar: { initials: 'SO', accent: 'Amber', photoUrl: null },
};

export type Kind = 'Did' | 'Restaurant' | 'Want';

export interface Said {
  by: Person;
  stars: number;
  text: string;
  at: Date;
}

export interface Shared {
  id: string;
  kind: Kind;
  title: string;
  /** A file of the mocks' images; null draws the Popkin's emoji. */
  picture: string | null;
  by: Person;
  when: string | null;
  place: string | null;
  sharedAt: Date;
  /** How many gave five, four, three, two and one star, the signed-in member's own left out. */
  counts: [number, number, number, number, number];
  keen: number;
  /** The first four who are keen, the earliest first (L2-042 AC1). */
  keenFaces: Person[];
  /** Whether the signed-in member is keen. */
  iAmKeen: boolean;
  /** The signed-in member's own rating. */
  mine: { stars: number; comment: string | null } | null;
  /** The newest first. */
  said: Said[];
}

const id = (n: number) => `00000000-0000-4000-b000-${String(n).padStart(12, '0')}`;
const sat = (hour: number, minute = 0) => new Date(2026, 8, 12, hour, minute);

export const canoeId = '00000000-0000-4000-a000-000000000081';
export const tacosId = id(3);
export const ridgeId = id(2);
export const beachId = id(1);

/** The four experiences of the list mock, the newest first. */
export function theMockExperiences(): Shared[] {
  return [
    {
      id: canoeId,
      kind: 'Did',
      title: 'Sunrise canoe to Heron Point',
      picture: 'lake.jpg',
      by: people.mara,
      when: 'Sat morning',
      place: 'Heron Point, Lake Ossia',
      sharedAt: sat(9, 0),
      counts: [9, 1, 1, 0, 0],
      keen: 0,
      keenFaces: [],
      iAmKeen: false,
      mine: null,
      said: [
        {
          by: people.walt,
          stars: 5,
          text: 'Saw a heron take off right in front of us. Best 6 am of my life, and I’m 71.',
          at: sat(9, 30),
        },
        {
          by: people.ellie,
          stars: 5,
          text: 'Grandpa paddled the whole way. I mostly took photos.',
          at: sat(9, 20),
        },
        {
          by: people.dev,
          stars: 4,
          text: 'Cold, wet, would do it again tomorrow.',
          at: sat(9, 10),
        },
      ],
    },
    {
      id: tacosId,
      kind: 'Restaurant',
      title: 'La Paloma Taqueria',
      picture: 'tacos.jpg',
      by: sam,
      when: 'Fri night',
      place: null,
      sharedAt: sat(8, 0),
      counts: [5, 4, 0, 0, 0],
      keen: 0,
      keenFaces: [],
      iAmKeen: false,
      mine: null,
      said: [],
    },
    {
      id: ridgeId,
      kind: 'Did',
      title: 'Ridge trail loop',
      picture: 'hike.jpg',
      by: people.walt,
      when: 'Sat afternoon',
      place: null,
      sharedAt: sat(7, 0),
      counts: [3, 4, 1, 0, 0],
      keen: 0,
      keenFaces: [],
      iAmKeen: false,
      mine: null,
      said: [],
    },
    {
      id: beachId,
      kind: 'Want',
      title: 'Beach day next summer?',
      picture: 'beach.jpg',
      by: people.ellie,
      when: null,
      place: null,
      sharedAt: sat(6, 0),
      counts: [0, 0, 0, 0, 0],
      keen: 7,
      keenFaces: [people.ellie, people.walt, people.dev, people.ruth],
      iAmKeen: false,
      mine: null,
      said: [],
    },
  ];
}

type Read = 'list' | 'detail';
type Change = 'rate' | 'comment' | 'share' | 'edit' | 'delete' | 'keen';
type End = 'server' | { status: number; code: string; field?: string };

export class Experiences {
  /** The newest first, as the API answers them. */
  shared: Shared[] = theMockExperiences();
  /** Who is signed in: their experiences are theirs to edit, and the Host deletes any. */
  viewer: Person = people.mara;
  host = true;
  wrappedUp = false;
  /** Whoever is signed in is not a member: every answer is 404 `popkin_not_found` (L2-051). */
  notAMember = false;

  /** What was asked of the list, in order: its filter. */
  readonly asked: string[] = [];
  /** The stars that reached the server, in order. */
  readonly rated: number[] = [];
  /** The comments that reached the server. */
  readonly commented: string[] = [];
  /** What "Share it" and "Save" sent: the fields, and the picture's file name. */
  readonly sent: {
    title: string;
    kind: string;
    when: string;
    place: string;
    picture: string | null;
    removePicture: boolean;
  }[] = [];
  readonly deleted: string[] = [];
  /** What reached the server of keen, in order: true for "I'm keen", false to take it back. */
  readonly keened: boolean[] = [];

  private readonly failing = new Set<Read>();
  private readonly heldReads = new Map<Read, Promise<void>>();
  private readonly ends = new Map<Change, End>();
  private readonly heldChanges = new Map<Change, Promise<void>>();
  private next = 100;

  constructor(private readonly page: Page) {}

  async install(): Promise<void> {
    await this.page.route(/\/experience-pictures\/[\w-]+\.jpg\?/, (route) => {
      const file = path.basename(new URL(route.request().url()).pathname);
      return route.fulfill({ path: path.join(images, file) });
    });
    const base = `**/api/popkins/${popkinId}/experiences`;
    await this.page.route(`${base}?*`, (route) => this.list(route));
    await this.page.route(base, (route) =>
      route.request().method() === 'POST' ? this.share(route) : this.list(route),
    );
    await this.page.route(`${base}/*`, (route) => {
      const experienceId = new URL(route.request().url()).pathname.split('/').pop() ?? '';
      if (experienceId === 'summary') return route.fallback();
      const method = route.request().method();
      if (method === 'PATCH') return this.edit(route, experienceId);
      if (method === 'DELETE') return this.remove(route, experienceId);
      return this.detail(route, experienceId);
    });
    await this.page.route(`${base}/*/my-rating`, (route) => this.rate(route));
    await this.page.route(`${base}/*/keen`, (route) => this.keenFor(route));
    await this.page.route(`${base}/*/my-rating/comment`, (route) => this.comment(route));
  }

  find(experienceId: string): Shared {
    const one = this.shared.find((s) => s.id === experienceId);
    if (!one) throw new Error(`No experience ${experienceId}.`);
    return one;
  }

  fail(read: Read): void {
    this.failing.add(read);
  }

  recover(read: Read): void {
    this.failing.delete(read);
  }

  /** The read does not answer until the returned function is called. */
  hold(read: Read): () => void {
    let release: () => void = () => undefined;
    this.heldReads.set(read, new Promise((resolve) => (release = resolve)));
    return release;
  }

  /** The change ends this way until `mend` is called. */
  break(change: Change, how: End = 'server'): void {
    this.ends.set(change, how);
  }

  mend(change: Change): void {
    this.ends.delete(change);
  }

  /** The change does not answer until the returned function is called. */
  holdChange(change: Change): () => void {
    let release: () => void = () => undefined;
    this.heldChanges.set(change, new Promise((resolve) => (release = resolve)));
    return release;
  }

  /** Nothing shared yet. */
  empty(): void {
    this.shared = [];
  }

  card(s: Shared, size: 'thumb' | 'display' = 'thumb'): Record<string, unknown> {
    const score = this.score(s);
    return {
      id: s.id,
      kind: s.kind,
      title: s.title,
      pictureUrl: s.picture ? `/experience-pictures/${s.picture}?${size}=${s.id}` : null,
      emoji: '🏕️',
      colour: 'Teal',
      sharedBy: s.by,
      when: s.when,
      sharedAt: s.sharedAt.toISOString(),
      average: score.average,
      ratingCount: score.ratingCount,
      keenCount: s.keen,
    };
  }

  private score(s: Shared) {
    const counts = [...s.counts];
    if (s.mine) counts[5 - s.mine.stars]++;
    const ratingCount = counts.reduce((sum, count) => sum + count, 0);
    const total = counts.reduce((sum, count, i) => sum + count * (5 - i), 0);
    return {
      average:
        ratingCount && s.kind !== 'Want' ? Math.round((total / ratingCount) * 10) / 10 : null,
      ratingCount,
      counts: counts.map((count, i) => ({ stars: 5 - i, count })),
    };
  }

  private comments(s: Shared): Record<string, unknown>[] {
    return s.said.map((c) => ({
      membershipId: c.by.membershipId,
      firstName: c.by.firstName,
      avatar: c.by.avatar,
      stars: c.stars,
      text: c.text,
      commentedAt: c.at.toISOString(),
    }));
  }

  private refuse(route: Route, status: number, code: string, extensions = {}): Promise<void> {
    const refusal = problem(status, code, extensions);
    return route.fulfill({ status: refusal.status, json: refusal.body, headers: refusal.headers });
  }

  private async read(route: Route, read: Read, body: () => unknown): Promise<void> {
    await this.heldReads.get(read);
    if (this.notAMember) return this.refuse(route, 404, 'popkin_not_found');
    if (this.failing.has(read)) return this.refuse(route, 500, 'server_error');
    return route.fulfill({ json: body() });
  }

  /** Whether the change goes on: false when it was answered with the end a spec gave it. */
  private async goesOn(route: Route, change: Change): Promise<boolean> {
    await this.heldChanges.get(change);
    const end = this.ends.get(change);
    if (!end) return true;
    await (end === 'server'
      ? this.refuse(route, 500, 'server_error')
      : this.refuse(route, end.status, end.code, end.field ? { field: end.field } : {}));
    return false;
  }

  private list(route: Route): Promise<void> {
    const filter = new URL(route.request().url()).searchParams.get('filter') ?? 'all';
    this.asked.push(filter);
    return this.read(route, 'list', () =>
      this.shared
        .filter((s) => filter === 'all' || (filter === 'want') === (s.kind === 'Want'))
        .map((s) => this.card(s)),
    );
  }

  private detail(route: Route, experienceId: string): Promise<void> {
    const s = this.shared.find((one) => one.id === experienceId);
    if (!s) return this.refuse(route, 404, 'experience_not_found');
    const own = s.by.membershipId === this.viewer.membershipId;
    return this.read(route, 'detail', () => ({
      ...this.card(s, 'display'),
      place: s.place,
      score: this.score(s),
      myRating: s.mine,
      comments: this.comments(s),
      keen: s.kind === 'Want' ? this.keenOf(s) : null,
      canRate: s.kind !== 'Want' && !this.wrappedUp,
      canKeen: s.kind === 'Want' && !this.wrappedUp,
      canEdit: own && !this.wrappedUp,
      canDelete: (own || this.host) && !this.wrappedUp,
    }));
  }

  private of(route: Route, back: number): Shared | undefined {
    const parts = new URL(route.request().url()).pathname.split('/');
    return this.shared.find((s) => s.id === parts[parts.length - back]);
  }

  private async rate(route: Route): Promise<void> {
    const s = this.of(route, 2);
    if (!s) return this.refuse(route, 404, 'experience_not_found');
    if (!(await this.goesOn(route, 'rate'))) return;
    const stars = Number(route.request().postDataJSON()?.stars);
    this.rated.push(stars);
    s.mine = { stars, comment: s.mine?.comment ?? null };
    const own = s.said.find((c) => c.by.membershipId === this.viewer.membershipId);
    if (own) own.stars = stars;
    return route.fulfill({ json: { stars, score: this.score(s) } });
  }

  private keenOf(s: Shared): Record<string, unknown> {
    return { count: s.keen, mine: s.iAmKeen, members: s.keenFaces };
  }

  /** PUT says the viewer is keen and DELETE takes it back; saying either twice changes nothing. */
  private async keenFor(route: Route): Promise<void> {
    const s = this.of(route, 2);
    if (!s) return this.refuse(route, 404, 'experience_not_found');
    if (!(await this.goesOn(route, 'keen'))) return;
    if (s.kind !== 'Want') return this.refuse(route, 409, 'experience_not_wanted');
    const keen = route.request().method() === 'PUT';
    this.keened.push(keen);
    if (keen && !s.iAmKeen) {
      s.keen++;
      if (s.keenFaces.length < 4) s.keenFaces = [...s.keenFaces, this.viewer];
    }
    if (!keen && s.iAmKeen) {
      s.keen--;
      s.keenFaces = s.keenFaces.filter((p) => p.membershipId !== this.viewer.membershipId);
    }
    s.iAmKeen = keen;
    return route.fulfill({ json: this.keenOf(s) });
  }

  private async comment(route: Route): Promise<void> {
    const s = this.of(route, 3);
    if (!s) return this.refuse(route, 404, 'experience_not_found');
    if (!(await this.goesOn(route, 'comment'))) return;
    if (!s.mine) return this.refuse(route, 409, 'rating_required');
    const text = String(route.request().postDataJSON()?.text ?? '');
    this.commented.push(text);
    s.mine = { ...s.mine, comment: text };
    s.said = [
      { by: this.viewer, stars: s.mine.stars, text, at: this.justNow() },
      ...s.said.filter((c) => c.by.membershipId !== this.viewer.membershipId),
    ];
    return route.fulfill({ json: this.comments(s)[0] });
  }

  private fields(route: Route) {
    const form = route.request().postDataBuffer()?.toString('latin1') ?? '';
    const field = (name: string) => {
      const sent = new RegExp(`name="${name}"\\r\\n\\r\\n([\\s\\S]*?)\\r\\n--`).exec(form)?.[1];
      return sent ? Buffer.from(sent, 'latin1').toString('utf8') : '';
    };
    return {
      title: field('title'),
      kind: field('kind'),
      when: field('when'),
      place: field('place'),
      picture: /name="picture"; filename="([^"]*)"/.exec(form)?.[1] ?? null,
      removePicture: field('removePicture') === 'true',
    };
  }

  private async share(route: Route): Promise<void> {
    if (!(await this.goesOn(route, 'share'))) return;
    const sent = this.fields(route);
    this.sent.push(sent);
    const one: Shared = {
      id: id(this.next++),
      kind: sent.kind as Kind,
      title: sent.title,
      picture: sent.picture,
      by: this.viewer,
      when: sent.when || null,
      place: sent.place || null,
      sharedAt: this.justNow(),
      counts: [0, 0, 0, 0, 0],
      keen: 0,
      keenFaces: [],
      iAmKeen: false,
      mine: null,
      said: [],
    };
    this.shared = [one, ...this.shared];
    return route.fulfill({
      status: 201,
      json: this.card(one),
      headers: { location: `/api/popkins/${popkinId}/experiences/${one.id}` },
    });
  }

  private async edit(route: Route, experienceId: string): Promise<void> {
    const s = this.shared.find((one) => one.id === experienceId);
    if (!s) return this.refuse(route, 404, 'experience_not_found');
    if (!(await this.goesOn(route, 'edit'))) return;
    const sent = this.fields(route);
    this.sent.push(sent);
    s.title = sent.title;
    s.kind = sent.kind as Kind;
    s.when = sent.when || null;
    s.place = sent.place || null;
    if (sent.picture) s.picture = sent.picture;
    else if (sent.removePicture) s.picture = null;
    return route.fulfill({ json: this.card(s) });
  }

  private async remove(route: Route, experienceId: string): Promise<void> {
    if (!(await this.goesOn(route, 'delete'))) return;
    this.deleted.push(experienceId);
    this.shared = this.shared.filter((s) => s.id !== experienceId);
    return route.fulfill({ status: 204 });
  }

  /** A moment of the mocks' Saturday, later each time, so what is new comes first. */
  private justNow(): Date {
    return new Date(sat(11, 0).getTime() + this.next * 1000);
  }
}

const all = new WeakMap<Page, Experiences>();

export function experiencesOf(page: Page): Experiences {
  const experiences = all.get(page);
  if (!experiences) throw new Error('This page has no experiences.');
  return experiences;
}

/** Mara, the Host of Lakeside Weekend, with its experiences answering. */
export async function maraWithExperiences(
  page: Page,
  change?: (experiences: Experiences, home: Home) => void,
): Promise<Experiences> {
  const experiences = new Experiences(page);
  await maraAtHome(page, (home) => change?.(experiences, home));
  await experiences.install();
  all.set(page, experiences);
  return experiences;
}

/** The experiences of the mocks on the mocks' day, Saturday 12 September 2026 at noon. */
export async function theMockExperienceScreens(
  page: Page,
  change?: (experiences: Experiences, home: Home) => void,
): Promise<void> {
  await page.clock.install({ time: homeNow });
  await maraWithExperiences(page, change);
}
