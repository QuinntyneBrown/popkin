import fs from 'node:fs';
import path from 'node:path';
import type { Page, Route } from '@playwright/test';
import { people, popkinId } from './chat';
import type { Home } from './home';
import { homeNow, maraAtHome } from './home';
import type { Hub } from './hub';
import { hubOf } from './hub';
import { problem } from './stubs';

/**
 * The album of Lakeside Weekend as the mocks draw it, answered in memory (ADR 0005): the
 * pages of the album, each photo with its neighbours, and the uploads, which a spec can hold,
 * fail or refuse.
 */
export const albumUrl = `/p/${popkinId}/photos`;
export const photoUrl = (id: string) => `${albumUrl}/${id}`;

const images = path.join(__dirname, '../../docs/mocks/assets/images');
const PAGE = 60;

type Person = (typeof people)[keyof typeof people];

export interface Shot {
  id: string;
  file: string;
  caption: string | null;
  by: Person;
  takenAt: Date;
  addedAt: Date;
  /** What journey 14 adds to a photo; none until a spec gives them. */
  reactions?: { emoji: string; count: number; mine: boolean }[];
  comments?: ShotComment[];
  canDelete?: boolean;
}

/** A comment as the API answers it, Mara's marked as hers. */
export function commentOf(said: ShotComment): Record<string, unknown> {
  return {
    id: said.id,
    author: {
      membershipId: said.by.membershipId,
      firstName: said.by.firstName,
      avatar: said.by.avatar,
    },
    addedAt: said.addedAt.toISOString(),
    text: said.text,
    mine: said.by === people.mara,
  };
}

export interface ShotComment {
  id: string;
  by: Person;
  addedAt: Date;
  text: string;
}

const id = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`;
const sat = (hour: number, minute = 0) => new Date(2026, 8, 12, hour, minute);
const fri = (hour: number, minute = 0) => new Date(2026, 8, 11, hour, minute);

const shot = (n: number, file: string, caption: string | null, by: Person, at: Date): Shot => ({
  id: id(n),
  file,
  caption,
  by,
  takenAt: at,
  addedAt: at,
});

/** The photos of the album mock, the latest first: nine on Saturday, nine on Friday. */
export function theMockAlbum(): Shot[] {
  return [
    shot(18, 'lake.jpg', 'First light on the dock. Worth the 6 am alarm.', people.mara, sat(7, 2)),
    shot(17, 'bonfire.jpg', 'Marshmallow technique: still debated.', people.walt, sat(6, 50)),
    shot(16, 'hike.jpg', 'Ridge trail, all six of us made it.', people.dev, sat(6, 40)),
    shot(15, 'picnic.jpg', 'Lunch on the lawn', people.ellie, sat(6, 30)),
    shot(14, 'tacos.jpg', 'Taco night in town', people.walt, sat(6, 20)),
    shot(13, 'beach.jpg', 'Grandpa vs the waves', people.ellie, sat(6, 10)),
    shot(12, 'bbq.jpg', 'Grill master Walt', people.dev, sat(6, 5)),
    shot(11, 'bake.jpg', 'Saturday dessert table', people.ruth, sat(6, 3)),
    shot(10, 'soccer.jpg', 'The kids invented a new game', people.walt, sat(6, 1)),
    shot(9, 'soccer.jpg', 'The kids invented a new game', people.walt, fri(20, 0)),
    shot(8, 'bake.jpg', 'Saturday dessert table', people.ruth, fri(19, 50)),
    shot(7, 'bbq.jpg', 'Grill master Walt', people.dev, fri(19, 40)),
    shot(6, 'beach.jpg', 'Grandpa vs the waves', people.ellie, fri(19, 30)),
    shot(5, 'tacos.jpg', 'Taco night in town', people.walt, fri(19, 20)),
    shot(4, 'picnic.jpg', 'Lunch on the lawn', people.ellie, fri(19, 10)),
    shot(3, 'hike.jpg', 'Ridge trail, all six of us made it.', people.dev, fri(19, 0)),
    shot(2, 'bonfire.jpg', 'Marshmallow technique: still debated.', people.walt, fri(18, 50)),
    shot(1, 'lake.jpg', 'First light on the dock. Worth the 6 am alarm.', people.walt, fri(18, 40)),
  ];
}

/** An album longer than a page: `count` photos by Walt, a minute apart, the latest first. */
export function aLongAlbum(count: number): Shot[] {
  return Array.from({ length: count }, (_, i) =>
    shot(
      count - i,
      'hike.jpg',
      `Photo ${count - i}`,
      people.walt,
      new Date(sat(11, 59).getTime() - i * 60_000),
    ),
  );
}

type Read = 'album' | 'more' | 'photo';
type UploadEnd = 'server' | 'photo_type_not_allowed' | 'photo_too_large' | 'popkin_wrapped_up';

export class Album {
  /** The latest first, as the API answers them. */
  shots: Shot[] = theMockAlbum();
  /** The whole album's counts; the mock says more than it draws. */
  photoCount: number | null = 48;
  contributorCount: number | null = 11;
  canAdd = true;
  /** The latest people to add a photo, as the header shows them; the mocks' four. */
  contributors: Person[] = [people.mara, people.walt, people.dev, people.ellie];

  /** What was asked of the album, in order. */
  readonly asked: { filter: string; cursor: string | null }[] = [];
  /** The uploads that reached the server: the file's name and its caption. */
  readonly uploaded: { name: string; caption: string | null }[] = [];

  private readonly failing = new Set<Read>();
  private readonly held = new Map<Read, Promise<void>>();
  private readonly uploadEnds = new Map<string, UploadEnd>();
  private uploadsHeld?: Promise<void>;
  private uploadsFree = 0;
  private brokenImages = false;
  private next = 100;

  constructor(private readonly page: Page) {}

  async install(): Promise<void> {
    await this.page.route(/\/photos\/[\w-]+\.jpg\?/, (route) => {
      if (this.brokenImages) return route.abort('failed');
      const file = path.basename(new URL(route.request().url()).pathname);
      return route.fulfill({ path: path.join(images, file) });
    });
    await this.page.route(`**/api/popkins/${popkinId}/photos?*`, (route) => this.album(route));
    await this.page.route(`**/api/popkins/${popkinId}/photos`, (route) =>
      route.request().method() === 'POST' ? this.upload(route) : this.album(route),
    );
    // Every photo view reads its comments (L2-035): none, unless a spec gives the photo some.
    await this.page.route(`**/api/popkins/${popkinId}/photos/*/comments`, (route) => {
      const photoId = new URL(route.request().url()).pathname.split('/').at(-2);
      const shot = this.shots.find((s) => s.id === photoId);
      return route.fulfill({
        json: (shot?.comments ?? []).map(commentOf),
      });
    });
    await this.page.route(`**/api/popkins/${popkinId}/photos/*`, (route) => {
      const photoId = new URL(route.request().url()).pathname.split('/').pop() ?? '';
      return photoId === 'summary' ? route.fallback() : this.photo(route, photoId);
    });
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
    this.held.set(read, new Promise((resolve) => (release = resolve)));
    return release;
  }

  /** Nothing in the album yet. */
  empty(): void {
    this.shots = [];
    this.photoCount = null;
    this.contributorCount = null;
  }

  /** The upload of the file of this name ends this way until `uploadsRecover` is called. */
  failUpload(name: string, how: UploadEnd = 'server'): void {
    this.uploadEnds.set(name, how);
  }

  uploadsRecover(): void {
    this.uploadEnds.clear();
  }

  /** No upload after the first `after` answers until the returned function is called. */
  holdUploads(after = 0): () => void {
    let release: () => void = () => undefined;
    this.uploadsFree = after;
    this.uploadsHeld = new Promise((resolve) => (release = resolve));
    return release;
  }

  /** The full-screen image stops arriving, as an address that expired would. */
  breakImages(): void {
    this.brokenImages = true;
  }

  mendImages(): void {
    this.brokenImages = false;
  }

  /** Someone else adds a photo: stored, counted and told over the hub (L2-031 AC7). */
  async added(hub: Hub, by: Person, caption: string | null, at: Date): Promise<Shot> {
    const one = this.store('picnic.jpg', caption, by, at);
    await hub.push('PhotosAdded', popkinId, [one.id]);
    return one;
  }

  summary(s: Shot): Record<string, unknown> {
    return {
      id: s.id,
      caption: s.caption,
      uploader: { membershipId: s.by.membershipId, firstName: s.by.firstName, avatar: s.by.avatar },
      takenAt: s.takenAt.toISOString(),
      addedAt: s.addedAt.toISOString(),
      thumbnailUrl: `/photos/${s.file}?thumb=${s.id}`,
      width: 480,
      height: 320,
      isMine: s.by === people.mara,
    };
  }

  /** A moment of the mocks' Saturday morning, later each time, so new photos come first. */
  justNow(): Date {
    return new Date(sat(11, 0).getTime() + this.next * 1000);
  }

  private store(file: string, caption: string | null, by: Person, at: Date): Shot {
    const one = shot(this.next++, file, caption, by, at);
    this.shots = [one, ...this.shots].sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
    if (this.photoCount !== null) this.photoCount++;
    return one;
  }

  private async answer(route: Route, read: Read, body: () => unknown): Promise<void> {
    await this.held.get(read);
    if (this.failing.has(read)) {
      const down = problem(500, 'server_error');
      return route.fulfill({ status: down.status, json: down.body });
    }
    return route.fulfill({ json: body() });
  }

  private album(route: Route): Promise<void> {
    const query = new URL(route.request().url()).searchParams;
    const filter = query.get('filter') ?? 'everyone';
    const cursor = query.get('cursor');
    this.asked.push({ filter, cursor });
    return this.answer(route, cursor ? 'more' : 'album', () => {
      const all = filter === 'mine' ? this.shots.filter((s) => s.by === people.mara) : this.shots;
      const from = cursor ? all.findIndex((s) => s.id === cursor) + 1 : 0;
      const items = all.slice(from, from + PAGE);
      const adders = [...new Set(this.shots.map((s) => s.by))];
      return {
        photoCount: this.photoCount ?? this.shots.length,
        contributorCount: this.contributorCount ?? adders.length,
        contributors: (this.shots.length ? this.contributors : []).map((p) => ({
          firstName: p.firstName,
          avatar: p.avatar,
        })),
        items: items.map((s) => this.summary(s)),
        nextCursor: from + PAGE < all.length ? items[items.length - 1].id : null,
        canAdd: this.canAdd,
      };
    });
  }

  private photo(route: Route, photoId: string): Promise<void> {
    const at = this.shots.findIndex((s) => s.id === photoId);
    if (at < 0) {
      const gone = problem(404, 'photo_not_found');
      return route.fulfill({ status: gone.status, json: gone.body });
    }
    const s = this.shots[at];
    return this.answer(route, 'photo', () => ({
      id: s.id,
      uploader: {
        membershipId: s.by.membershipId,
        firstName: s.by.firstName,
        displayName: displayNames[s.by.firstName] ?? s.by.firstName,
        avatar: s.by.avatar,
      },
      addedAt: s.addedAt.toISOString(),
      takenAt: s.takenAt.toISOString(),
      caption: s.caption,
      imageUrl: `/photos/${s.file}?display=${s.id}`,
      width: 1600,
      height: 1067,
      reactions: s.reactions ?? [],
      commentCount: s.comments?.length ?? 0,
      previousPhotoId: this.shots[at - 1]?.id ?? null,
      nextPhotoId: this.shots[at + 1]?.id ?? null,
      canDelete: s.canDelete ?? true,
      isMine: s.by === people.mara,
    }));
  }

  private async upload(route: Route): Promise<void> {
    const form = route.request().postDataBuffer()?.toString('latin1') ?? '';
    const name = /name="file"; filename="([^"]*)"/.exec(form)?.[1] ?? '';
    const sent = /name="caption"\r\n\r\n([\s\S]*?)\r\n--/.exec(form)?.[1];
    const caption = sent ? Buffer.from(sent, 'latin1').toString('utf8') : null;
    if (this.uploadsFree-- <= 0) await this.uploadsHeld;
    const end = this.uploadEnds.get(name);
    if (end) {
      const refusal =
        end === 'server'
          ? problem(500, 'server_error')
          : problem(end === 'popkin_wrapped_up' ? 409 : 400, end, { field: 'file' });
      return route.fulfill({ status: refusal.status, json: refusal.body });
    }
    this.uploaded.push({ name, caption });
    const file = fs.existsSync(path.join(images, name)) ? name : 'picnic.jpg';
    const one = this.store(file, caption, people.mara, this.justNow());
    await hubOf(this.page).push('PhotosAdded', popkinId, [one.id]);
    return route.fulfill({ status: 201, json: this.summary(one) });
  }
}

const displayNames: Record<string, string> = {
  Mara: 'Mara Okafor',
  Walt: 'Walt Brennan',
  Dev: 'Dev Patel',
  Ellie: 'Ellie Brennan',
  Ruth: 'Ruth Lindqvist',
};

/** A photo on the device, to choose in the picker: one of the mocks' images under this name. */
export function aPhoto(
  name: string,
  from = name,
): { name: string; mimeType: string; buffer: Buffer } {
  return { name, mimeType: 'image/jpeg', buffer: fs.readFileSync(path.join(images, from)) };
}

/** A file of this many megabytes that says it is a JPEG. */
export function aFileOf(megabytes: number, name = 'huge.jpg', mimeType = 'image/jpeg') {
  return { name, mimeType, buffer: Buffer.alloc(megabytes * 1024 * 1024, 1) };
}

/** A real photo padded to this many megabytes: it still draws, and is too large to add. */
export function aBigPhoto(megabytes: number, name: string) {
  const photo = fs.readFileSync(path.join(images, name));
  const padding = Buffer.alloc(megabytes * 1024 * 1024 - photo.length);
  return { name, mimeType: 'image/jpeg', buffer: Buffer.concat([photo, padding]) };
}

/** The three photos the Add photos mocks draw. */
export const theThree = () => [aPhoto('lake.jpg'), aPhoto('bonfire.jpg'), aPhoto('hike.jpg')];

const albums = new WeakMap<Page, Album>();

export function albumOf(page: Page): Album {
  const album = albums.get(page);
  if (!album) throw new Error('This page has no album.');
  return album;
}

/** The album answering for whoever is signed in on this page. */
export async function withTheAlbum(page: Page): Promise<Album> {
  const album = new Album(page);
  await album.install();
  albums.set(page, album);
  return album;
}

/** Mara, the Host of Lakeside Weekend, with its album answering. */
export async function maraInTheAlbum(
  page: Page,
  change?: (album: Album, home: Home) => void,
): Promise<Album> {
  const album = new Album(page);
  await maraAtHome(page, (home) => change?.(album, home));
  await album.install();
  albums.set(page, album);
  return album;
}

/*
 * The states the mocks draw, for the sweeps and the parity specs: each is the step before the
 * page opens.
 */

/** The album of the mocks on the mocks' day, Saturday 12 September 2026 at noon. */
export async function theMockPhotos(
  page: Page,
  change?: (album: Album, home: Home) => void,
): Promise<void> {
  await page.clock.install({ time: homeNow });
  await maraInTheAlbum(page, change);
}

export const theAlbumLoading = (page: Page) => theMockPhotos(page, (album) => album.hold('album'));
export const theAlbumEmpty = (page: Page) => theMockPhotos(page, (album) => album.empty());
export const theAlbumFailing = (page: Page) => theMockPhotos(page, (album) => album.fail('album'));

/** The album where Mara has added nothing. */
export const theAlbumWithoutMine = (page: Page) =>
  theMockPhotos(page, (album) => {
    album.shots = album.shots.map((s) => (s.by === people.mara ? { ...s, by: people.walt } : s));
  });

export const thePhotoLoading = (page: Page) => theMockPhotos(page, (album) => album.hold('photo'));
export const thePhotoFailing = (page: Page) => theMockPhotos(page, (album) => album.fail('photo'));

/** A photo arrives for the album that is open. */
export async function someoneAddsAPhoto(
  page: Page,
  caption: string | null = 'Canoe race',
): Promise<Shot> {
  const album = albumOf(page);
  return album.added(hubOf(page), people.walt, caption, album.justNow());
}

/*
 * The states of the Add photos mocks, each opened from the album that is on screen.
 */

const dockCaption = 'First light on the dock. Worth the 6 am alarm.';

async function chooseFor(page: Page, files: ReturnType<typeof aPhoto>[]): Promise<void> {
  await page.locator('input[type="file"]').setInputFiles(files);
  const dialog = page.getByRole('dialog', { name: 'Add photos' });
  await dialog.getByLabel('Caption for photo 1').fill(dockCaption);
}

const theAction = (page: Page) =>
  page.getByRole('dialog', { name: 'Add photos' }).locator('.dialog__footer').getByRole('button');

/** Three photos chosen, the first with its caption. */
export const chooseTheThree = (page: Page) => chooseFor(page, theThree());

/** The third is 14 MB. */
export const chooseOneTooLarge = (page: Page) =>
  chooseFor(page, [aPhoto('lake.jpg'), aPhoto('bonfire.jpg'), aBigPhoto(14, 'hike.jpg')]);

/** The three are on their way; `sent` of them have arrived. */
export async function addTheThreeSlowly(page: Page, sent = 0): Promise<void> {
  albumOf(page).holdUploads(sent);
  await chooseTheThree(page);
  await theAction(page).click();
  await page.getByText(`Uploading ${sent + 1} of 3`).waitFor();
}

/** The third did not upload; the other two are in the album. */
export async function addTheThreeWithOneFailing(page: Page): Promise<void> {
  albumOf(page).failUpload('hike.jpg');
  await chooseTheThree(page);
  await theAction(page).click();
  await page.getByRole('button', { name: 'Done' }).waitFor();
}
