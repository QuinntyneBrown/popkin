import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { message, people, popkinId, threadId } from './chat';
import { hubOf } from './hub';
import { homeNow } from './home';
import { inviteCode, maraWithPhoto } from './journeys';
import { aCamera, holdUp, type CameraAnswer } from './camera';
import { MyPopkinsPage } from '../pages/my-popkins.page';
import { ScanToJoinDialog } from '../pages/scan-to-join.dialog';
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

/** How many reads of the list each page has had answered, or seen fail. */
const reads = new WeakMap<Page, number>();

function countReads(page: Page): void {
  if (reads.has(page)) return;
  reads.set(page, 0);
  const count = (request: { method(): string; url(): string }) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/popkins') {
      reads.set(page, (reads.get(page) ?? 0) + 1);
    }
  };
  page.on('requestfinished', count);
  page.on('requestfailed', count);
}

/**
 * The list is read when the screen opens and again once the hub has connected, to catch what
 * was missed in between. A spec that changes the answer, or pushes an event, waits for both, so
 * the second read cannot land in the middle of what it does.
 */
export async function theListHasSettled(page: Page): Promise<void> {
  await expect.poll(() => reads.get(page) ?? 0).toBeGreaterThanOrEqual(2);
}

/** Mara's Popkins on the mocks' day; `list` is what the API answers. */
export async function maraWithPopkins(page: Page, list: MyPopkins = theMockList): Promise<void> {
  countReads(page);
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
  countReads(page);
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
  if (reads.get(page)) await theListHasSettled(page);
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
  await theListHasSettled(page);
  await hubOf(page).push(
    'MessageAdded',
    message(author, text, new Date(homeNow.getTime() + 60_000), {
      threadId: popkin.everyoneThreadId,
    }),
  );
}

/*
 * The states the mocks draw, for the sweeps and the parity specs: each is the step before the
 * page opens, or the step that brings the open page to the state.
 */

/** My Popkins of the mocks: Mara with her photograph and the five Popkins. */
export async function theMockPopkins(page: Page, list: MyPopkins = theMockList): Promise<void> {
  await maraWithPhoto(page);
  await maraWithPopkins(page, list);
}

export const thePopkinsActiveOnly = (page: Page): Promise<void> =>
  theMockPopkins(page, theActiveOnly);

export const thePopkinsEmpty = (page: Page): Promise<void> => theMockPopkins(page, noPopkins);

export async function thePopkinsLoading(page: Page): Promise<void> {
  await theMockPopkins(page);
  await hold(page, listKey);
}

export async function thePopkinsFailing(page: Page): Promise<void> {
  await maraWithPhoto(page);
  await theListFailing(page);
}

/** The open list loses its connection, and says so. */
export async function thePopkinsGoOffline(page: Page): Promise<void> {
  const popkins = new MyPopkinsPage(page);
  await popkins.cards.first().waitFor();
  await goOffline(page);
  await popkins.offlineBanner.waitFor();
}

/** My Popkins with a camera that answers as told. */
export const withACamera =
  (how: CameraAnswer) =>
  async (page: Page): Promise<void> => {
    await aCamera(page, how);
    await theMockPopkins(page);
  };

/** Opens Scan to join from the header of My Popkins. */
export async function openTheScanner(page: Page): Promise<void> {
  await new MyPopkinsPage(page).scanToJoin.click();
  await new ScanToJoinDialog(page).panel.waitFor();
}

/** The scanner reads a QR code that is not a Popkin's. */
export async function scanSomethingElse(page: Page): Promise<void> {
  await openTheScanner(page);
  const scan = new ScanToJoinDialog(page);
  await scan.frame.waitFor();
  await holdUp(page, 'https://example.com/menu');
  await scan.alert.waitFor();
}

/**
 * The scanner has found a Popkin's code and its invite is on its way: the invite's screen is
 * held back, so the dialog stays as it says so.
 */
export async function scanAPopkinAndWait(page: Page): Promise<void> {
  await openTheScanner(page);
  const scan = new ScanToJoinDialog(page);
  await scan.frame.waitFor();
  await page.route(/\.js(\?.*)?$/, () => undefined);
  await holdUp(page, inviteCode);
  await scan.scanner.and(page.getByRole('status')).waitFor();
}
