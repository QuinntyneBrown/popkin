import path from 'node:path';
import type { Page } from '@playwright/test';
import { message, people, popkinId, threadId } from './chat';
import { hubOf } from './hub';
import { homeNow } from './home';
import { answer, failNetwork, hold, problem } from './stubs';

/**
 * My Popkins as the mocks draw it, answered in memory (ADR 0005): three active Popkins and two
 * that wrapped up. Lakeside Weekend is the recorded Popkin, so its card opens a home the other
 * fixtures answer.
 */
export const listKey = 'GET /api/popkins';

type Avatar = (typeof people)[keyof typeof people]['avatar'];

const id = (n: number) => `00000000-0000-4000-b000-${String(n).padStart(12, '0')}`;

const active = (
  n: number,
  name: string,
  emoji: string,
  colour: string,
  endsAt: Date | null,
  memberCount: number,
  avatars: Avatar[],
  latest: [string, string] | null,
  unreadCount: number,
) => ({
  id: n === 1 ? popkinId : id(n),
  name,
  emoji,
  colour,
  endsAt: endsAt?.toISOString() ?? null,
  memberCount,
  avatars,
  latestMessage: latest ? { firstName: latest[0], text: latest[1] } : null,
  unreadCount,
  everyoneThreadId: n === 1 ? threadId : id(100 + n),
  viewerMembershipId: n === 1 ? people.mara.membershipId : id(200 + n),
});

const wrapped = (
  n: number,
  name: string,
  emoji: string,
  colour: string,
  wrappedUpAt: Date,
  peopleCount: number,
  photoCount: number,
) => ({
  id: id(n),
  name,
  emoji,
  colour,
  wrappedUpAt: wrappedUpAt.toISOString(),
  peopleCount,
  photoCount,
});

export const lakeside = active(
  1,
  'Lakeside Weekend',
  '🏕️',
  'Teal',
  new Date(2026, 8, 13, 18, 0),
  14,
  [people.mara.avatar, people.walt.avatar, people.dev.avatar],
  ['Mara', 'last call for the canoe sign-up'],
  3,
);
export const thursday = active(
  2,
  'Thursday Night Group',
  '🕯️',
  'Amber',
  null,
  9,
  [people.walt.avatar, people.dev.avatar, people.ellie.avatar],
  ['Walt', 'Same time next week? I’ll bring soup'],
  0,
);
export const tigers = active(
  3,
  'Tigers U9 Parents',
  '⚽',
  'Leaf',
  new Date(2026, 10, 30, 18, 0),
  22,
  [people.dev.avatar, people.ellie.avatar, people.ruth.avatar],
  ['Priya', 'Lift needed from Elm St on Saturday'],
  12,
);
export const buildWeekend = wrapped(
  4,
  'Build Weekend ’26',
  '💻',
  'Sky',
  new Date(2026, 2, 8),
  48,
  312,
);
export const reunion = wrapped(5, 'Brennan Reunion', '🌻', 'Berry', new Date(2026, 7, 2), 31, 540);

export type MyPopkins = {
  active: (typeof lakeside)[];
  wrappedUp: (typeof buildWeekend)[];
};

export const theMockList: MyPopkins = {
  active: [lakeside, thursday, tigers],
  wrappedUp: [buildWeekend, reunion],
};

export const popkinsUrl = '/popkins';

/** Mara's Popkins on the mocks' day; `list` is what the API answers. */
export async function maraWithPopkins(page: Page, list: MyPopkins = theMockList): Promise<void> {
  await page.clock.install({ time: homeNow });
  await page.route('**/photos/call*.jpg', (route) =>
    route.fulfill({
      path: path.join(
        __dirname,
        '../../docs/mocks/assets/images',
        path.basename(new URL(route.request().url()).pathname),
      ),
    }),
  );
  await answer(page, listKey, { status: 200, body: list });
}

export const theActiveOnly: MyPopkins = { active: theMockList.active, wrappedUp: [] };
export const noPopkins: MyPopkins = { active: [], wrappedUp: [] };

/** The list does not load: the server fails. */
export async function theListFailing(page: Page): Promise<void> {
  await page.clock.install({ time: homeNow });
  await answer(page, listKey, problem(500, 'server_error'));
}

/** The list is held in flight; the returned function lets it through. */
export async function theListLoading(page: Page): Promise<() => void> {
  await maraWithPopkins(page);
  return hold(page, listKey);
}

/** The device loses its connection: the browser says so and the list cannot be read. */
export async function goOffline(page: Page): Promise<void> {
  await failNetwork(page, listKey);
  await page.context().setOffline(true);
}

/** The connection returns and the list answers again. */
export async function comeBackOnline(page: Page, list: MyPopkins = theMockList): Promise<void> {
  await answer(page, listKey, { status: 200, body: list });
  await page.context().setOffline(false);
}

/** Someone writes in the Everyone thread of one of Mara's Popkins. */
export async function someoneWritesIn(
  page: Page,
  popkin: typeof lakeside,
  text: string,
  author: (typeof people)[keyof typeof people] = people.walt,
): Promise<void> {
  await hubOf(page).push(
    'MessageAdded',
    message(author, text, new Date(homeNow.getTime() + 60_000), {
      threadId: popkin.everyoneThreadId,
    }),
  );
}
