import path from 'node:path';
import type { Page, Route } from '@playwright/test';
import { Chat, maraInTheChat, people, popkinId, saturday, threadId } from './chat';
import type { Hub } from './hub';
import { hubOf } from './hub';
import { lakesideInvite, mockToday } from './journeys';
import { problem } from './stubs';

/**
 * The home of Lakeside Weekend as the mocks draw it, answered in memory (ADR 0005). The five
 * reads of the home each have their own answer here, so a spec can empty one, fail one or hold
 * one; the thread behind the Chat card is the chat fixture's.
 */
export const homeUrl = `/p/${popkinId}`;

/**
 * The mocks' Saturday noon, less half a minute: the clock runs while a spec does, and the time
 * left reads "1 day 6 hrs" only until the thirty hours are no longer whole.
 */
export const homeNow = new Date(mockToday.getTime() - 30_000);

type Person = (typeof people)[keyof typeof people];

interface Line {
  id: string;
  author: Person;
  text: string;
  sentAt: string;
}

const line = (n: number, author: Person, text: string, at: Date): Line => ({
  id: `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`,
  author,
  text,
  sentAt: at.toISOString(),
});

const named = (
  person: Person,
  displayName: string,
  role: 'Host' | 'Member' = 'Member',
  isViewer = false,
) => ({ membershipId: person.membershipId, displayName, avatar: person.avatar, role, isViewer });

const other = (displayName: string, initials: string, accent: string) => ({
  membershipId: `00000000-0000-4000-8000-${initials.toLowerCase().padEnd(12, '0')}`,
  displayName,
  avatar: { initials, accent, photoUrl: null },
  role: 'Member' as const,
  isViewer: false,
});

/** The fourteen members of the mocks, the Host first. */
export const theFourteen = [
  named(people.mara, 'Mara Okafor', 'Host', true),
  named(people.walt, 'Walt Brennan'),
  named(people.dev, 'Dev Patel'),
  named(people.ellie, 'Ellie Brennan'),
  named(people.ruth, 'Ruth Lindqvist'),
  other('Sam Ortega', 'SO', 'Amber'),
  other('Grace Adeyemi', 'GA', 'Plum'),
  other('Priya Nair', 'PN', 'Coral'),
  other('Tomás Rivera', 'TR', 'Sky'),
  other('Noor Haddad', 'NH', 'Leaf'),
  other('Ines Duarte', 'ID', 'Berry'),
  other('Kofi Mensah', 'KM', 'Teal'),
  other('Lena Fischer', 'LF', 'Amber'),
  named(people.joel, 'Joel'),
];

const photo = (n: number, file: string, caption: string) => ({
  id: `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`,
  thumbnailUrl: `/photos/${file}`,
  caption,
});

type Failure = 'server' | 'not-found';
export type HomeRead = 'popkin' | 'preview' | 'photos' | 'experiences' | 'members';

export class Home {
  popkin = {
    id: popkinId,
    name: 'Lakeside Weekend',
    emoji: '🏕️',
    colour: 'Teal',
    status: 'Active' as 'Active' | 'WrappedUp',
    endsAt: new Date(2026, 8, 13, 18, 0).toISOString() as string | null,
    wrappedUpAt: null as string | null,
    keepPhotos: true,
    photosRemoveAt: null as string | null,
    photosRemovedAt: null as string | null,
    memberCount: 14,
    avatars: [people.mara, people.walt, people.dev, people.ellie].map((p) => p.avatar),
    viewerRole: 'Host' as 'Host' | 'Member',
    viewer: { membershipId: people.mara.membershipId, firstName: 'Mara' },
    unreadCount: 3,
  };
  /** The latest of the Everyone thread, oldest first; the API answers four at most. */
  latest: Line[] = [
    line(1, people.dev, 'Coffee’s on at the main cabin', saturday(9, 5)),
    line(2, people.walt, 'Pancakes at the main cabin, 8:30. Bring an appetite.', saturday(9, 12)),
    line(3, people.ellie, 'Can someone grab the paddles from the shed?', saturday(9, 20)),
    line(4, people.mara, 'On it! Also: last call for the canoe sign-up 🛶', saturday(9, 24)),
  ];
  newCount = 3;
  photos = {
    count: 48,
    photos: [
      photo(1, 'lake.jpg', 'First light on the dock. Worth the 6 am alarm.'),
      photo(2, 'bonfire.jpg', 'Marshmallow technique: still debated.'),
      photo(3, 'hike.jpg', 'Ridge trail, all six of us made it.'),
      photo(4, 'picnic.jpg', 'Lunch on the lawn'),
      photo(5, 'tacos.jpg', 'Taco night in town'),
      photo(6, 'beach.jpg', 'Grandpa vs the waves'),
      photo(7, 'bbq.jpg', 'Grill master Walt'),
      photo(8, 'bake.jpg', 'Saturday dessert table'),
    ],
  };
  experiences = {
    count: 4,
    top: [
      {
        id: '00000000-0000-4000-b000-000000000001',
        name: 'Sunrise canoe to Heron Point',
        photoUrl: '/photos/lake.jpg' as string | null,
        average: 4.7,
        ratingCount: 11,
      },
      {
        id: '00000000-0000-4000-b000-000000000002',
        name: 'La Paloma Taqueria',
        photoUrl: '/photos/tacos.jpg',
        average: 4.6,
        ratingCount: 9,
      },
      {
        id: '00000000-0000-4000-b000-000000000003',
        name: 'Ridge trail loop',
        photoUrl: '/photos/hike.jpg',
        average: 4.3,
        ratingCount: 8,
      },
    ],
  };
  members = [...theFourteen];

  /** How many times each read was asked for. */
  readonly asked: Record<HomeRead, number> = {
    popkin: 0,
    preview: 0,
    photos: 0,
    experiences: 0,
    members: 0,
  };
  private readonly failing = new Map<HomeRead, Failure>();
  private readonly held = new Map<HomeRead, Promise<void>>();

  constructor(
    private readonly page: Page,
    readonly chat: Chat,
  ) {}

  async install(): Promise<void> {
    await this.page.route('**/photos/*.jpg', (route) =>
      route.fulfill({
        path: path.join(
          __dirname,
          '../../docs/mocks/assets/images',
          path.basename(new URL(route.request().url()).pathname),
        ),
      }),
    );
    await this.page.route(`**/api/popkins/${popkinId}`, (route) => this.answer(route, 'popkin'));
    await this.page.route(`**/api/popkins/${popkinId}/**`, (route) => {
      const rest = new URL(route.request().url()).pathname.split(`${popkinId}/`)[1];
      const read = (
        {
          'threads/everyone/preview': 'preview',
          'photos/summary': 'photos',
          'experiences/summary': 'experiences',
          members: 'members',
        } as Record<string, HomeRead>
      )[rest];
      return read && route.request().method() === 'GET'
        ? this.answer(route, read)
        : route.fallback();
    });
  }

  /** The read fails this way until `recover` is called. */
  fail(read: HomeRead, how: Failure = 'server'): void {
    this.failing.set(read, how);
  }

  recover(read: HomeRead): void {
    this.failing.delete(read);
  }

  /** The read does not answer until the returned function is called. */
  hold(read: HomeRead): () => void {
    let release: () => void = () => undefined;
    this.held.set(read, new Promise((resolve) => (release = resolve)));
    return release;
  }

  /** Nobody but the Host, and nothing written, added or shared: the mocks' empty home. */
  justTheHost(): void {
    this.popkin = { ...this.popkin, memberCount: 1, avatars: [people.mara.avatar], unreadCount: 0 };
    this.latest = [];
    this.newCount = 0;
    this.photos = { count: 0, photos: [] };
    this.experiences = { count: 0, top: [] };
    this.members = [theFourteen[0]];
    this.chat.messages = [];
  }

  /** Someone else writes to everyone: stored, counted as new and sent over the hub. */
  async arrives(hub: Hub, author: Person, text: string, at: Date): Promise<void> {
    const added = line(this.latest.length + 100, author, text, at);
    this.latest.push(added);
    this.newCount++;
    await hub.push('MessageAdded', {
      id: added.id,
      threadId,
      clientMessageId: null,
      kind: 'Member',
      author,
      text,
      sentAt: added.sentAt,
    });
  }

  /** Someone joins: counted, listed last and told over the hub. */
  async joins(hub: Hub, displayName: string, initials: string): Promise<void> {
    const joined = other(displayName, initials, 'Sky');
    this.members.push(joined);
    this.popkin = { ...this.popkin, memberCount: this.members.length };
    await hub.push('MemberJoined', popkinId, {
      membershipId: joined.membershipId,
      firstName: displayName.split(' ')[0],
      avatar: joined.avatar,
    });
  }

  private async answer(route: Route, read: HomeRead): Promise<void> {
    this.asked[read]++;
    await this.held.get(read);
    const failure = this.failing.get(read);
    if (failure) {
      const answer =
        failure === 'not-found' ? problem(404, 'popkin_not_found') : problem(500, 'server_error');
      return route.fulfill({ status: answer.status, json: answer.body });
    }
    return route.fulfill({ json: this.body(read) });
  }

  private body(read: HomeRead): unknown {
    switch (read) {
      case 'popkin':
        return this.popkin;
      case 'preview':
        return { threadId, messages: this.latest.slice(-4), newCount: this.newCount };
      case 'photos':
        return this.photos;
      case 'experiences':
        return this.experiences;
      case 'members':
        return this.members;
    }
  }
}

const homes = new WeakMap<Page, Home>();

export function homeOf(page: Page): Home {
  const home = homes.get(page);
  if (!home) throw new Error('This page has no home.');
  return home;
}

/** Mara, the Host of Lakeside Weekend, with its home answering. */
export async function maraAtHome(page: Page, change?: (home: Home) => void): Promise<Home> {
  const chat = await maraInTheChat(page);
  const home = new Home(page, chat);
  change?.(home);
  await home.install();
  await lakesideInvite(page);
  homes.set(page, home);
  return home;
}

/*
 * The states the mocks draw, for the sweeps and the parity specs: each is the step before the
 * page opens.
 */

/** The home of the mocks on the mocks' day, Saturday 12 September 2026 at noon. */
export async function theMockHome(page: Page, change?: (home: Home) => void): Promise<void> {
  await page.clock.install({ time: homeNow });
  await maraAtHome(page, change);
}

export async function theHomeLoading(page: Page): Promise<void> {
  await theMockHome(page, (home) => {
    for (const read of ['popkin', 'preview', 'photos', 'experiences', 'members'] as const) {
      home.hold(read);
    }
  });
}

export async function theHomeEmpty(page: Page): Promise<void> {
  await theMockHome(page, (home) => home.justTheHost());
}

export async function theHomeFailing(page: Page): Promise<void> {
  await theMockHome(page, (home) => home.fail('popkin'));
}

/** Photos fail; the rest of the home is fine. */
export async function theHomeWithoutPhotos(page: Page): Promise<void> {
  await theMockHome(page, (home) => home.fail('photos'));
}

/** A message arrives for the home that is open. */
export async function someoneWrites(page: Page, text = 'Kettle is on'): Promise<void> {
  await homeOf(page).arrives(hubOf(page), people.walt, text, new Date());
}

/** Opens "Bring someone in" from the home. */
export async function openTheInvite(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Invite', exact: true }).click();
  await page.getByRole('dialog').getByRole('img').waitFor();
}

/** The same, with the link copied a moment ago. */
export async function copyTheInvite(page: Page): Promise<void> {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await openTheInvite(page);
  await page.getByRole('button', { name: 'Copy invite link' }).click();
}
