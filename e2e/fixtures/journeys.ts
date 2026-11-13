import path from 'node:path';
import type { Page } from '@playwright/test';
import responses from './api/responses.json';
import { answer, answerOnce, problem } from './stubs';
import { NameYourPopkinPage } from '../pages/name-your-popkin.page';
import { VerifyCodePage } from '../pages/verify-code.page';

/**
 * Brings the app to states the recorded journey reaches, for specs and parity cases that start
 * part-way through it. Each step drives the screens; nothing is injected.
 */
const sent = responses['POST /api/auth/codes'].body;

/** When the recorded code was sent: 30 seconds before a new one may be asked for. */
export const codeSentAt = new Date(new Date(sent.resendAvailableAt).getTime() - 30_000);

/** The code screen, six seconds after the code was sent ("Send a new code in 0:24"). */
export async function codeScreenAt24Seconds(page: Page): Promise<void> {
  await page.clock.install({ time: codeSentAt });
  await new VerifyCodePage(page).reach();
  await page.clock.runFor(6_000);
}

/** Saturday 12 September 2026, noon on the device: the day the mocks show. */
export const mockToday = new Date(2026, 8, 12, 12, 0, 0);

/** How long, after naming Lakeside Weekend, with the device clock on the mocks' day. */
export async function howLongForLakeside(page: Page, today = mockToday): Promise<void> {
  await page.clock.install({ time: today });
  await page.goto('/new');
  const step = new NameYourPopkinPage(page);
  await step.chooseLakeside();
  await step.looksGood.click();
  await page.locator('body[data-page="how-long"]').waitFor();
}

/**
 * Mara with the photograph the mocks give her, so parity compares the same avatar. The recorded
 * session has no photo: there the avatar shows her initials.
 */
export async function maraWithPhoto(page: Page): Promise<void> {
  await answer(page, 'GET /api/auth/session', {
    status: 200,
    body: { ...responses['GET /api/auth/session'].body, photoUrl: '/photos/mara.jpg' },
  });
  await page.route('**/photos/mara.jpg', (route) =>
    route.fulfill({ path: path.join(__dirname, '../../docs/mocks/assets/images/call1.jpg') }),
  );
}

const created = responses['POST /api/popkins'].body;

/**
 * The created screen with the invite the mocks show (`popk.in/lakeside`), so parity compares the
 * same text. A slug a Host chooses has no screen yet; the code is otherwise random.
 */
export async function lakesideInvite(page: Page): Promise<void> {
  await answer(page, `GET /api/popkins/${created.id}/invite`, {
    status: 200,
    body: {
      code: 'lakeside',
      url: 'https://popk.in/lakeside',
      popkinName: 'Lakeside Weekend',
      emoji: '🏕️',
      colour: 'Teal',
    },
  });
}

/** A share sheet, as a phone has. */
export async function withShareSheet(page: Page): Promise<void> {
  await page.addInitScript(() => {
    navigator.share = async () => undefined;
  });
}

/** The created screen's invite read fails on the server, with the reference the mock shows. */
export async function inviteFailsOnTheServer(page: Page): Promise<void> {
  await answerOnce(
    page,
    `GET /api/popkins/${created.id}/invite`,
    problem(500, 'server_error', { reference: 'PK-7F3A-2C19' }),
  );
}

/** The invite code of the recorded Lakeside Weekend, and the keys of its invite answers. */
export const inviteCode = created.inviteCode;
export const previewKey = `GET /api/invites/${inviteCode}`;
export const membersKey = `GET /api/invites/${inviteCode}/members`;
export const joinKey = `POST /api/invites/${inviteCode}/join`;

const recordedPreview = responses[previewKey as keyof typeof responses].body as InvitePreview;

interface Avatar {
  initials: string;
  accent: string;
  photoUrl: string | null;
}

interface InvitePreview {
  state: string;
  name: string;
  emoji: string;
  colour: string;
  memberCount: number;
  endsAt: string | null;
  wrappedUpAt: string | null;
  avatars: Avatar[];
  inviter: { firstName: string; avatar: Avatar };
  viewer: { isMember: boolean; popkinId: string | null };
}

/** A visitor: nobody is signed in on this device. */
export async function asVisitor(page: Page): Promise<void> {
  await answer(page, 'GET /api/auth/session', problem(401, 'unauthorized'));
}

/** Joel, signed in and not yet a member: the person the joining mocks follow. */
export async function asJoel(page: Page): Promise<void> {
  await answer(page, 'GET /api/auth/session', {
    status: 200,
    body: { personId: '5d0c8e0e-6f0b-4f0e-9d53-0f6a1c1b2a3d', name: 'Joel', photoUrl: null },
  });
}

/** The photographs the mocks give four of the cast, served where the stubs below point. */
async function castPhotos(page: Page): Promise<void> {
  await page.route('**/photos/call*.jpg', (route) =>
    route.fulfill({
      path: path.join(
        __dirname,
        '../../docs/mocks/assets/images',
        path.basename(new URL(route.request().url()).pathname),
      ),
    }),
  );
}

const cast: { displayName: string; avatar: Avatar }[] = [
  {
    displayName: 'Mara Okafor',
    avatar: { initials: 'MO', accent: 'Coral', photoUrl: '/photos/call1.jpg' },
  },
  {
    displayName: 'Walt Brennan',
    avatar: { initials: 'WB', accent: 'Leaf', photoUrl: '/photos/call2.jpg' },
  },
  {
    displayName: 'Dev Patel',
    avatar: { initials: 'DP', accent: 'Sky', photoUrl: '/photos/call3.jpg' },
  },
  {
    displayName: 'Ellie Brennan',
    avatar: { initials: 'EB', accent: 'Berry', photoUrl: '/photos/call4.jpg' },
  },
  { displayName: 'Ruth Lindqvist', avatar: { initials: 'RL', accent: 'Teal', photoUrl: null } },
  { displayName: 'Sam Ortega', avatar: { initials: 'SO', accent: 'Amber', photoUrl: null } },
  { displayName: 'Grace Adeyemi', avatar: { initials: 'GA', accent: 'Plum', photoUrl: null } },
  { displayName: 'Priya Nair', avatar: { initials: 'PN', accent: 'Coral', photoUrl: null } },
];

/**
 * The invite the mocks show: fourteen people, five avatars, Mara's photograph, and an end on
 * Sunday 13 September 2026 at 6 pm on the device. Pair it with `page.clock` on `mockToday`.
 * The recorded Popkin has three members; a cast of fourteen cannot sign up from one address
 * within ten minutes (L2-053 AC1).
 */
export async function lakesideCast(page: Page, change: Partial<InvitePreview> = {}): Promise<void> {
  await castPhotos(page);
  await answer(page, previewKey, {
    status: 200,
    body: {
      ...recordedPreview,
      memberCount: 14,
      endsAt: new Date(2026, 8, 13, 18, 0).toISOString(),
      avatars: cast.slice(0, 5).map((member) => member.avatar),
      inviter: { firstName: 'Mara', avatar: cast[0].avatar },
      ...change,
    },
  });
  await answer(page, membersKey, { status: 200, body: { members: cast, othersCount: 6 } });
  await answer(page, joinKey, {
    status: 201,
    body: {
      ...(responses[joinKey as keyof typeof responses].body as object),
      namedMembers: ['Mara', 'Walt'],
      othersCount: 12,
    },
  });
}

/** The same invite once the Popkin has wrapped up, on Sunday 6 September 2026. */
export async function wrappedUpInvite(page: Page): Promise<void> {
  await lakesideCast(page, {
    state: 'WrappedUp',
    wrappedUpAt: new Date(2026, 8, 6, 18, 0).toISOString(),
  });
}

/** The invite as a member of the Popkin gets it. */
export async function asMemberOfLakeside(page: Page): Promise<void> {
  await answer(page, previewKey, {
    status: 200,
    body: { ...recordedPreview, viewer: { isMember: true, popkinId: created.id } },
  });
}

/** A visitor opening the invite the mocks draw, on the mocks' day. */
export async function theMockInvite(page: Page): Promise<void> {
  await page.clock.install({ time: mockToday });
  await asVisitor(page);
  await lakesideCast(page);
}

/** The same, once the Popkin has wrapped up. */
export async function theMockWrappedInvite(page: Page): Promise<void> {
  await page.clock.install({ time: mockToday });
  await asVisitor(page);
  await wrappedUpInvite(page);
}

/** A visitor whose invite never finishes loading. */
export async function theInviteLoading(page: Page): Promise<void> {
  await asVisitor(page);
  await page.route(`**/api/invites/${inviteCode}`, () => undefined);
}

/** A visitor whose invite fails to load. */
export async function theInviteFailing(page: Page): Promise<void> {
  await asVisitor(page);
  await answer(page, previewKey, problem(500, 'server_error'));
}
