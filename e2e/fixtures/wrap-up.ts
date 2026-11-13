import type { Page, Route } from '@playwright/test';
import { people, popkinId } from './chat';
import { type Home, homeNow, maraAtHome } from './home';
import type { Hub } from './hub';
import { problem } from './stubs';

/**
 * Wrapping up Lakeside Weekend and its recap as the mocks draw them, answered in memory
 * (ADR 0005). Wrapping up changes what the home and the thread answer too, as the API's does.
 */
export const wrapUpUrl = `/p/${popkinId}/wrap-up`;
export const recapUrl = `/p/${popkinId}/recap`;

/** Sunday 13 September 2026 at 6 pm: when the mocks' Popkin wrapped up. */
export const sundayEvening = new Date(2026, 8, 13, 18, 0);
const DAY_MS = 24 * 60 * 60_000;

export type WrapUpCall = 'preview' | 'wrapUp' | 'recap' | 'export' | 'progress' | 'crew';

export interface AlbumExport {
  id: string;
  status: 'Preparing' | 'Ready' | 'Failed';
  photosDone: number;
  photosTotal: number;
  downloadUrl: string | null;
}

const exportId = '00000000-0000-4000-c000-000000000001';
export const zipUrl = '/photos/lakeside-weekend.zip';

export const preparing = (photosDone: number): AlbumExport => ({
  id: exportId,
  status: 'Preparing',
  photosDone,
  photosTotal: 48,
  downloadUrl: null,
});
export const ready = (): AlbumExport => ({
  ...preparing(48),
  status: 'Ready',
  downloadUrl: zipUrl,
});

export class WrapUp {
  /** What the wrap-up screen says of the recap to come. */
  preview = { memberCount: 14, photoCount: 48, messageCount: 1286 };
  recap = {
    id: popkinId,
    name: 'Lakeside Weekend',
    emoji: '🏕️',
    colour: 'Teal',
    startedAt: new Date(2026, 8, 11, 16, 0).toISOString(),
    wrappedUpAt: sundayEvening.toISOString(),
    keepPhotos: true,
    photosRemoveAt: null as string | null,
    photosRemovedAt: null as string | null,
    isHost: true,
    peopleCount: 14,
    messageCount: 1286,
    photoCount: 48,
    photos: [
      { id: '00000000-0000-4000-a000-000000000001', thumbnailUrl: '/photos/lake.jpg' },
      { id: '00000000-0000-4000-a000-000000000002', thumbnailUrl: '/photos/bonfire.jpg' },
      { id: '00000000-0000-4000-a000-000000000003', thumbnailUrl: '/photos/hike.jpg' },
    ],
    avatars: [people.mara, people.walt, people.dev, people.ellie, people.ruth].map(
      (person) => person.avatar,
    ),
    topRated: {
      experienceId: '00000000-0000-4000-a000-000000000081',
      title: 'Sunrise canoe to Heron Point',
      pictureUrl: '/photos/lake.jpg',
      average: 4.7,
      ratingCount: 11,
      sharedBy: { firstName: 'Mara' },
    } as {
      experienceId: string;
      title: string;
      pictureUrl: string | null;
      average: number;
      ratingCount: number;
      sharedBy: { firstName: string };
    } | null,
  };
  /** What starting the album's zip answers, then what each look at its progress does. */
  zip: AlbumExport[] = [preparing(0), preparing(12), ready()];

  /** What the app sent, in order. */
  readonly sent: { keepPhotos: boolean }[] = [];
  readonly crew: { popkinId: string; fromPopkinId: string }[] = [];
  exportsStarted = 0;

  private readonly broken = new Set<WrapUpCall>();
  private readonly held = new Map<WrapUpCall, Promise<void>>();
  private step = 0;
  private stranger = false;

  constructor(
    private readonly page: Page,
    readonly home: Home,
  ) {}

  get wrappedUp(): boolean {
    return this.home.popkin.status === 'WrappedUp';
  }

  async install(): Promise<void> {
    const popkin = `**/api/popkins/${popkinId}`;
    await this.page.route(`${popkin}/wrap-up`, (route) =>
      route.request().method() === 'GET' ? this.previewed(route) : this.wrapUpAsked(route),
    );
    await this.page.route(`${popkin}/recap`, (route) => this.recapAsked(route));
    await this.page.route(`${popkin}/recap/album-exports`, (route) => this.exportAsked(route));
    await this.page.route(`${popkin}/recap/album-exports/*`, (route) => this.progressAsked(route));
    await this.page.route('**/api/popkins/*/crew-invites', (route) => this.crewAsked(route));
    await this.page.route(`**${zipUrl}`, (route) =>
      route.fulfill({
        body: 'PK',
        contentType: 'application/zip',
        headers: { 'content-disposition': 'attachment; filename="Lakeside Weekend.zip"' },
      }),
    );
  }

  /** The call fails until `mend` is called. */
  break(call: WrapUpCall): void {
    this.broken.add(call);
  }

  mend(call: WrapUpCall): void {
    this.broken.delete(call);
  }

  /** The call does not answer until the returned function is called. */
  hold(call: WrapUpCall): () => void {
    let release: () => void = () => undefined;
    this.held.set(call, new Promise((resolve) => (release = resolve)));
    return release;
  }

  /** Someone who is not the Host looks at it. */
  asMember(): void {
    this.home.popkin = { ...this.home.popkin, viewerRole: 'Member' };
    this.recap = { ...this.recap, isHost: false };
  }

  /** Whoever looks is not a member: nothing of the Popkin answers them. */
  notAMember(): void {
    this.stranger = true;
    this.home.fail('popkin', 'not-found');
  }

  /** The Popkin has wrapped up: the home, the thread and the recap all say so. */
  wrap(keepPhotos = true, at: Date = sundayEvening): void {
    const photosRemoveAt = keepPhotos ? null : new Date(at.getTime() + 30 * DAY_MS).toISOString();
    this.home.popkin = {
      ...this.home.popkin,
      status: 'WrappedUp',
      wrappedUpAt: at.toISOString(),
      keepPhotos,
      photosRemoveAt,
    };
    this.home.chat.thread = { ...this.home.chat.thread, readOnly: true };
    this.recap = { ...this.recap, wrappedUpAt: at.toISOString(), keepPhotos, photosRemoveAt };
  }

  /** Thirty days on, the photos of an album that was not kept are gone. */
  removePhotos(): void {
    const removedAt = this.recap.photosRemoveAt ?? new Date().toISOString();
    this.home.popkin = { ...this.home.popkin, photosRemovedAt: removedAt };
    this.recap = { ...this.recap, photosRemovedAt: removedAt, photos: [] };
  }

  /** The Host wraps it up from another device: wrapped up, and told over the hub. */
  async wrapsUpElsewhere(hub: Hub): Promise<void> {
    this.wrap();
    await hub.push('PopkinWrappedUp', popkinId);
  }

  private async gate(route: Route, call: WrapUpCall): Promise<boolean> {
    await this.held.get(call);
    if (this.stranger) {
      await this.refuse(route, 404, 'popkin_not_found');
      return false;
    }
    if (!this.broken.has(call)) return true;
    await this.refuse(route, 500, 'server_error');
    return false;
  }

  private refuse(route: Route, status: number, code: string): Promise<void> {
    const answer = problem(status, code);
    return route.fulfill({ status: answer.status, json: answer.body });
  }

  private async previewed(route: Route): Promise<void> {
    if (!(await this.gate(route, 'preview'))) return;
    if (this.wrappedUp) return this.refuse(route, 409, 'popkin_wrapped_up');
    if (this.home.popkin.viewerRole !== 'Host') return this.refuse(route, 403, 'host_only');
    return route.fulfill({ json: this.preview });
  }

  private async wrapUpAsked(route: Route): Promise<void> {
    const body = route.request().postDataJSON() as { keepPhotos: boolean };
    this.sent.push(body);
    if (!(await this.gate(route, 'wrapUp'))) return;
    if (this.wrappedUp) return this.refuse(route, 409, 'popkin_wrapped_up');
    this.wrap(body.keepPhotos, new Date());
    return route.fulfill({ json: { popkinId, wrappedUpAt: this.recap.wrappedUpAt } });
  }

  private async recapAsked(route: Route): Promise<void> {
    if (!(await this.gate(route, 'recap'))) return;
    if (!this.wrappedUp) return this.refuse(route, 409, 'popkin_active');
    return route.fulfill({ json: this.recap });
  }

  private async exportAsked(route: Route): Promise<void> {
    this.exportsStarted++;
    this.step = 0;
    if (!(await this.gate(route, 'export'))) return;
    return route.fulfill({ status: 202, json: this.zip[0] });
  }

  private async progressAsked(route: Route): Promise<void> {
    if (!(await this.gate(route, 'progress'))) return;
    this.step = Math.min(this.step + 1, this.zip.length - 1);
    return route.fulfill({ json: this.zip[this.step] });
  }

  private async crewAsked(route: Route): Promise<void> {
    const to = new URL(route.request().url()).pathname.split('/')[3];
    const body = route.request().postDataJSON() as { fromPopkinId: string };
    this.crew.push({ popkinId: to, fromPopkinId: body.fromPopkinId });
    if (!(await this.gate(route, 'crew'))) return;
    return route.fulfill({ status: 202 });
  }
}

const wrapUps = new WeakMap<Page, WrapUp>();

export function wrapUpOf(page: Page): WrapUp {
  const wrapUp = wrapUps.get(page);
  if (!wrapUp) throw new Error('This page has no wrap-up.');
  return wrapUp;
}

/** Mara, the Host of Lakeside Weekend, with wrapping up and the recap answering. */
export async function maraWithWrapUp(
  page: Page,
  change?: (wrapUp: WrapUp) => void,
): Promise<WrapUp> {
  const home = await maraAtHome(page);
  const wrapUp = new WrapUp(page, home);
  change?.(wrapUp);
  await wrapUp.install();
  wrapUps.set(page, wrapUp);
  return wrapUp;
}

/** The same on the mocks' day, Saturday 12 September 2026 at noon. */
export async function theMockWrapUp(page: Page, change?: (wrapUp: WrapUp) => void): Promise<void> {
  await page.clock.install({ time: homeNow });
  await maraWithWrapUp(page, change);
}

/** Lakeside Weekend wrapped up on Sunday evening; the recap is read on the Monday after. */
export async function theMockRecap(page: Page, change?: (wrapUp: WrapUp) => void): Promise<void> {
  await page.clock.install({ time: new Date(2026, 8, 14, 9, 0) });
  await maraWithWrapUp(page, (wrapUp) => {
    wrapUp.wrap();
    change?.(wrapUp);
  });
}

/** The crew's invites alone, for the start of a Popkin: what was asked, in order. */
export async function crewInvites(
  page: Page,
  answers: 'sent' | 'fails' = 'sent',
): Promise<{ popkinId: string; fromPopkinId: string }[]> {
  const asked: { popkinId: string; fromPopkinId: string }[] = [];
  await page.route('**/api/popkins/*/crew-invites', (route) => {
    const body = route.request().postDataJSON() as { fromPopkinId: string };
    asked.push({
      popkinId: new URL(route.request().url()).pathname.split('/')[3],
      fromPopkinId: body.fromPopkinId,
    });
    const refused = problem(500, 'server_error');
    return answers === 'sent'
      ? route.fulfill({ status: 202 })
      : route.fulfill({ status: refused.status, json: refused.body });
  });
  return asked;
}
