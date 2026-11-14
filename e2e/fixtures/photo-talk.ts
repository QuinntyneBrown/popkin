import type { Page, Route } from '@playwright/test';
import { people, popkinId } from './chat';
import type { Home } from './home';
import { hubOf } from './hub';
import type { Album, Shot, ShotComment } from './photos';
import { commentOf, photoUrl, theMockAlbum, theMockPhotos } from './photos';
import { problem } from './stubs';

/** What can be made to fail, each until it is mended. */
type Failing = 'react' | 'comments' | 'post' | 'delete-comment' | 'save' | 'delete';

const sat = (hour: number, minute = 0) => new Date(2026, 8, 12, hour, minute);

/** The comments of the photo-comments mock, oldest first. */
export function theMockComments(): ShotComment[] {
  return [
    {
      id: 'c-walt',
      by: people.walt,
      addedAt: sat(7, 40),
      text: 'That dock! Wish I’d been up for it.',
    },
    { id: 'c-ellie', by: people.ellie, addedAt: sat(8, 2), text: 'Framing this one for Grandma.' },
    {
      id: 'c-dev',
      by: people.dev,
      addedAt: sat(8, 15),
      text: 'The heron was just out of shot, I swear.',
    },
  ];
}

/** The reactions of the not-reacted mock: nine hearts, none of them Mara's, and four heart eyes. */
export const theMockReactions = () => [
  { emoji: '❤️', count: 9, mine: false },
  { emoji: '😍', count: 4, mine: false },
];

/**
 * Engaging with a photo (L2-034 to L2-036): its reactions, its comments, Save photo and its
 * deletion, answered from the album's photos as the API would, each request kept for a spec.
 */
export class PhotoTalk {
  readonly reacted: { method: string; emoji: string }[] = [];
  readonly posted: string[] = [];
  readonly deletedComments: string[] = [];
  readonly deletedPhotos: string[] = [];
  saves = 0;
  private readonly failing = new Set<Failing>();
  private next = 1;

  constructor(
    private readonly page: Page,
    private readonly album: Album,
  ) {}

  async install(): Promise<void> {
    const base = `**/api/popkins/${popkinId}/photos`;
    await this.page.route(`${base}/*/reactions/*`, (route) => this.react(route));
    await this.page.route(`${base}/*/comments`, (route) => this.comments(route));
    await this.page.route(`${base}/*/comments/*`, (route) => this.deleteComment(route));
    await this.page.route(`${base}/*/download`, (route) => this.download(route));
    await this.page.route('**/saved/*.jpg', (route) =>
      route.fulfill({
        body: Buffer.from('a saved photo'),
        headers: {
          'content-type': 'image/jpeg',
          'content-disposition': 'attachment; filename="popkin-photo-20260912-0658.jpg"',
        },
      }),
    );
    await this.page.route(`${base}/*`, (route) =>
      route.request().method() === 'DELETE' ? this.deletePhoto(route) : route.fallback(),
    );
  }

  fail(what: Failing): void {
    this.failing.add(what);
  }

  mend(what: Failing): void {
    this.failing.delete(what);
  }

  /** Someone deletes this photo: the hub tells whoever has it open (L2-036 AC3). */
  async deletedBySomeone(shot: Shot): Promise<void> {
    this.album.shots = this.album.shots.filter((s) => s !== shot);
    await hubOf(this.page).push('PhotoDeleted', popkinId, shot.id);
  }

  private shot(route: Route): Shot | undefined {
    const parts = new URL(route.request().url()).pathname.split('/');
    const id = parts[parts.indexOf('photos') + 1];
    return this.album.shots.find((s) => s.id === id);
  }

  private refuse(route: Route, status = 500, code = 'server_error'): Promise<void> {
    const refusal = problem(status, code);
    return route.fulfill({ status: refusal.status, json: refusal.body });
  }

  private react(route: Route): Promise<void> {
    const shot = this.shot(route);
    if (!shot) return this.refuse(route, 404, 'photo_not_found');
    const method = route.request().method();
    const emoji = decodeURIComponent(
      new URL(route.request().url()).pathname.split('/').pop() ?? '',
    );
    this.reacted.push({ method, emoji });
    if (this.failing.has('react')) return this.refuse(route);
    const reactions = (shot.reactions ??= []);
    const given = reactions.find((r) => r.emoji === emoji);
    if (method === 'PUT' && !given?.mine) {
      if (given) Object.assign(given, { count: given.count + 1, mine: true });
      else reactions.push({ emoji, count: 1, mine: true });
    }
    if (method === 'DELETE' && given?.mine)
      Object.assign(given, { count: given.count - 1, mine: false });
    shot.reactions = reactions.filter((r) => r.count > 0);
    return route.fulfill({ json: shot.reactions });
  }

  private async comments(route: Route): Promise<void> {
    const shot = this.shot(route);
    if (!shot) return this.refuse(route, 404, 'photo_not_found');
    const comments = (shot.comments ??= []);
    if (route.request().method() === 'POST') {
      const { text } = route.request().postDataJSON() as { text: string };
      this.posted.push(text);
      if (this.failing.has('post')) return this.refuse(route);
      const added = {
        id: `c-new-${this.next++}`,
        by: people.mara,
        addedAt: sat(12),
        text: text.trim(),
      };
      comments.push(added);
      return route.fulfill({ status: 201, json: commentOf(added) });
    }
    if (this.failing.has('comments')) return this.refuse(route);
    return route.fulfill({ json: comments.map(commentOf) });
  }

  private deleteComment(route: Route): Promise<void> {
    const shot = this.shot(route);
    const id = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    this.deletedComments.push(id);
    if (this.failing.has('delete-comment')) return this.refuse(route);
    if (shot) shot.comments = (shot.comments ?? []).filter((c) => c.id !== id);
    return route.fulfill({ status: 204 });
  }

  private download(route: Route): Promise<void> {
    const shot = this.shot(route);
    if (!shot) return this.refuse(route, 404, 'photo_not_found');
    this.saves++;
    if (this.failing.has('save')) return this.refuse(route);
    return route.fulfill({
      json: { url: `/saved/${shot.id}.jpg`, expiresAt: sat(13).toISOString() },
    });
  }

  private async deletePhoto(route: Route): Promise<void> {
    const shot = this.shot(route);
    if (!shot) return this.refuse(route, 404, 'photo_not_found');
    this.deletedPhotos.push(shot.id);
    if (this.failing.has('delete')) return this.refuse(route);
    this.album.shots = this.album.shots.filter((s) => s !== shot);
    await route.fulfill({ status: 204 });
    await hubOf(this.page).push('PhotoDeleted', popkinId, shot.id);
  }
}

const talks = new WeakMap<Page, PhotoTalk>();

/** Mara on the dock photo of the mocks, with its reactions and comments answering. */
export async function maraOnTheDock(
  page: Page,
  change?: (dock: Shot, album: Album, home: Home) => void,
): Promise<{ talk: PhotoTalk; dock: Shot; url: string }> {
  let talk: PhotoTalk | undefined;
  let dock: Shot | undefined;
  let album: Album | undefined;
  await theMockPhotos(page, (a, home) => {
    album = a;
    dock = a.shots.find((s) => s.id === theMockAlbum()[0].id);
    if (!dock) throw new Error('The mocks’ album has no dock photo.');
    dock.reactions = theMockReactions();
    dock.comments = theMockComments();
    change?.(dock, a, home);
  });
  if (!album || !dock) throw new Error('The album did not open.');
  talk = new PhotoTalk(page, album);
  await talk.install();
  talks.set(page, talk);
  return { talk, dock, url: photoUrl(dock.id) };
}

export function talkOf(page: Page): PhotoTalk {
  const talk = talks.get(page);
  if (!talk) throw new Error('This page has no photo talk.');
  return talk;
}
