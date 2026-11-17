import path from 'node:path';
import type { Page } from '@playwright/test';
import { recordedMe } from './admin';

/**
 * The admin Notifications page's answers. No API serves `/api/admin/notifications` yet (ADR 0030),
 * so nothing is recorded: these build the designed DTOs from the mocks, in L2-154's words.
 */

/** What the Owner may do once notifications are built: the recording's actions and the two new ones. */
export const OWNER_ALLOWED = [...recordedMe.allowed, 'ManageNotifications', 'HoldNotifications'];

export interface MockKind {
  kind: string;
  name: string;
  about: string;
  required: boolean;
  offForEveryone: boolean;
  offSince: string | null;
  offByName: string | null;
  offReason: string | null;
  sent24h: number;
  openedPercent: number | null;
}

export interface MockGroup {
  group: 'Activity' | 'Reminders' | 'Account';
  name: string;
  kinds: MockKind[];
}

export interface MockSendStatus {
  paused: boolean;
  pausedAt: string | null;
  pausedByName: string | null;
  pauseReason: string | null;
  queued: number;
  resumeMinutes: number | null;
  sentToday: number;
  bouncedPercent: number | null;
  medianSecondsToInbox: number | null;
}

export interface MockNotifications {
  status: MockSendStatus;
  groups: MockGroup[];
  holdCount: number;
}

const kind = (
  kind: string,
  name: string,
  about: string,
  sent24h: number,
  openedPercent: number | null,
  extra: Partial<MockKind> = {},
): MockKind => ({
  kind,
  name,
  about,
  required: false,
  offForEveryone: false,
  offSince: null,
  offByName: null,
  offReason: null,
  sent24h,
  openedPercent,
  ...extra,
});

/** Sending since the morning: the counts `default.html` draws. */
export const sendingStatus = (): MockSendStatus => ({
  paused: false,
  pausedAt: null,
  pausedByName: null,
  pauseReason: null,
  queued: 0,
  resumeMinutes: null,
  sentToday: 48210,
  bouncedPercent: 0.4,
  medianSecondsToInbox: 41,
});

/** Paused at 10:12 by Lena Fischer, 3,240 queued: `paused.html`. */
export const pausedStatus = (): MockSendStatus => ({
  ...sendingStatus(),
  paused: true,
  pausedAt: new Date(2026, 6, 14, 10, 12).toISOString(),
  pausedByName: 'Lena Fischer',
  pauseReason: 'Digest sending twice.',
  queued: 3240,
  resumeMinutes: 6,
});

/** The twelve kinds of L2-154 with the mocks' counts; Experiences off since 9 July. */
export const mockGroups = (): MockGroup[] => [
  {
    group: 'Activity',
    name: 'When something changes',
    kinds: [
      kind(
        'MentionsAndReplies',
        'Mentions and replies',
        'Someone @mentions you or replies to you',
        9412,
        61,
      ),
      kind('DirectMessages', 'Direct messages', 'A message just to you', 6880, 58),
      kind('GroupChat', 'Group chat', 'New messages in a Popkin’s chat', 4105, 22),
      kind('NewPhotos', 'New photos', 'Photos added to an album', 7390, 47),
      kind('PlanChanges', 'Plan changes', 'Stories added, moved or given to you', 5204, 52),
      kind(
        'ScheduleChanges',
        'Schedule changes',
        'Someone books time off or the week shifts',
        1962,
        31,
      ),
      kind('PeopleJoining', 'People joining', 'Someone new joins a Popkin', 2418, 39),
      kind('Experiences', 'Experiences', 'New places, ratings and comments', 0, null, {
        offForEveryone: true,
        offSince: new Date(2026, 6, 9, 9, 0).toISOString(),
        offByName: 'Lena Fischer',
        offReason: 'Rating emails firing on every star change',
      }),
    ],
  },
  {
    group: 'Reminders',
    name: 'Reminders',
    kinds: [
      kind(
        'Birthdays',
        'Birthdays',
        'Birthdays, key dates, follow-ups and habits for your contacts',
        3071,
        68,
      ),
      kind('StoriesDue', 'Stories due', 'The day before a story you own is due', 2233, 57),
      kind('PopkinWrappingUp', 'Popkin wrapping up', '24 hours before a Popkin wraps up', 412, 71),
    ],
  },
  {
    group: 'Account',
    name: 'Your account',
    kinds: [
      kind(
        'SignInAndSecurity',
        'Sign-in codes and security',
        'Codes, new devices and account changes',
        573,
        94,
        {
          required: true,
        },
      ),
    ],
  },
];

/**
 * The Notifications page of the mocks at noon on 14 July, signed in as the Owner with the
 * notification actions. `change` alters the answer before it is sent; the returned object is the
 * one the stub answers from, so a test's write stub can change it.
 */
export async function theMockNotifications(
  page: Page,
  change?: (notifications: MockNotifications) => void,
): Promise<MockNotifications> {
  await page.clock.install({ time: new Date(2026, 6, 14, 12, 0) });
  const notifications: MockNotifications = {
    status: sendingStatus(),
    groups: mockGroups(),
    holdCount: 4,
  };
  change?.(notifications);
  await page.route('**/api/admin/me', (route) =>
    route.fulfill({ json: { ...recordedMe, role: 'Owner', allowed: OWNER_ALLOWED } }),
  );
  await page.route('**/api/admin/notifications', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: notifications }) : route.fallback(),
  );
  return notifications;
}

/** The Notifications page with member email paused, as `paused.html` draws it. */
export const theMockNotificationsPaused = async (page: Page): Promise<void> => {
  await theMockNotifications(page, (n) => (n.status = pausedStatus()));
};

/** A write the notification stubs answered: its method, its path and its body. */
export interface NotificationWrite {
  method: string;
  path: string;
  body: Record<string, unknown>;
}

/**
 * Answers the pause, the resume and a kind's switch as the API would, changing `notifications`
 * so the page's next read agrees, and records each body. Lena Fischer makes every change at noon.
 */
export async function savesNotifications(
  page: Page,
  notifications: MockNotifications,
): Promise<NotificationWrite[]> {
  const writes: NotificationWrite[] = [];
  const at = new Date(2026, 6, 14, 12, 0).toISOString();
  await page.route('**/api/admin/notifications/**', (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
    const reason = (body['reason'] as string | null) ?? null;
    if (request.method() === 'POST' && path.endsWith('/pause')) {
      writes.push({ method: 'POST', path, body });
      Object.assign(notifications.status, {
        paused: true,
        pausedAt: at,
        pausedByName: 'Lena Fischer',
        pauseReason: reason,
        queued: 0,
        resumeMinutes: 1,
      });
      return route.fulfill({ json: notifications.status });
    }
    if (request.method() === 'POST' && path.endsWith('/resume')) {
      writes.push({ method: 'POST', path, body });
      notifications.status = sendingStatus();
      return route.fulfill({ json: notifications.status });
    }
    const kind = /\/kinds\/(\w+)$/.exec(path)?.[1];
    if (request.method() === 'PUT' && kind) {
      writes.push({ method: 'PUT', path, body });
      const found = notifications.groups.flatMap((g) => g.kinds).find((k) => k.kind === kind)!;
      Object.assign(
        found,
        body['on']
          ? { offForEveryone: false, offSince: null, offByName: null, offReason: null }
          : { offForEveryone: true, offSince: at, offByName: 'Lena Fischer', offReason: reason },
      );
      return route.fulfill({ json: found });
    }
    return route.fallback();
  });
  return writes;
}

export interface MockHoldPopkin {
  id: string;
  name: string;
  emoji: string;
  colour: string;
  members: number;
  inviteCode: string;
}

export interface MockHoldPerson {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface MockHold {
  id: string | null;
  target: 'Popkin' | 'Person';
  automatic: boolean;
  popkin: MockHoldPopkin | null;
  person: MockHoldPerson | null;
  why: string;
  byName: string;
  since: string;
  until: 'UntilReleased' | 'WhileSuspended' | 'UntilDeleted';
}

export interface MockHolds {
  holds: MockHold[];
  suppressedAddresses: number | null;
}

export interface MockHoldMatch {
  popkinId: string;
  name: string;
  emoji: string;
  colour: string;
  inviteCode: string;
}

const day = (date: number): string => new Date(2026, 6, date, 9, 0).toISOString();

/** The four holds `holds.html` draws: two by hand, then two automatic. */
export const mockHolds = (): MockHolds => ({
  holds: [
    {
      id: 'hold-reunion',
      target: 'Popkin',
      automatic: false,
      popkin: {
        id: 'popkin-reunion',
        name: 'Class of 2015 Reunion',
        emoji: '🎓',
        colour: 'Plum',
        members: 46,
        inviteCode: 'GRAD-1507',
      },
      person: null,
      why: 'Reported for spam invites; 46 members, 3 reports',
      byName: 'Aiko Tanaka',
      since: day(12),
      until: 'UntilReleased',
    },
    {
      id: 'hold-priya',
      target: 'Person',
      automatic: false,
      popkin: null,
      person: {
        id: 'person-priya',
        name: 'Priya Nair',
        email: 'priya.nair@fastmail.com',
        avatar: null,
      },
      why: 'Asked support to stop all mail while travelling',
      byName: 'Aiko Tanaka',
      since: day(10),
      until: 'UntilReleased',
    },
    {
      id: null,
      target: 'Person',
      automatic: true,
      popkin: null,
      person: {
        id: 'person-ruth',
        name: 'Ruth Lindqvist',
        email: 'ruth.lindqvist@proton.me',
        avatar: null,
      },
      why: 'Account suspended',
      byName: 'System',
      since: day(6),
      until: 'WhileSuspended',
    },
    {
      id: null,
      target: 'Person',
      automatic: true,
      popkin: null,
      person: {
        id: 'person-grace',
        name: 'Grace Adeyemi',
        email: 'grace.adeyemi@gmail.com',
        avatar: '/photos/grace.jpg',
      },
      why: 'Account being deleted',
      byName: 'System',
      since: day(1),
      until: 'UntilDeleted',
    },
  ],
  suppressedAddresses: 1206,
});

/** The active Popkins not held, as `hold-adding.html` lists them. */
export const mockHoldMatches = (): MockHoldMatch[] => [
  ['popkin-bakery', 'Bakery Launch Crew', '🥐', 'Amber', 'CRMB-0093'],
  ['popkin-brunch', 'Sunday Brunch Club', '🥞', 'Coral', 'SYRP-7710'],
  ['popkin-lakeside', 'Lakeside Weekend', '🏕️', 'Teal', 'PINE-4821'],
  ['popkin-owl', 'Hackathon Team Owl', '🦉', 'Sky', 'OWLS-2201'],
  ['popkin-hornets', 'U10 Hornets Parents', '⚽', 'Leaf', 'HRNT-0410'],
].map(([popkinId, name, emoji, colour, inviteCode]) => ({
  popkinId,
  name,
  emoji,
  colour,
  inviteCode,
}));

const gracePhoto = path.join(__dirname, '../../docs/mocks/assets/images/contact-grace.jpg');

/**
 * The Notifications page's Holds tab as `holds.html` draws it: the page of `theMockNotifications`,
 * the holds, and the search, which matches the text in a name or the whole invite code.
 */
export async function theMockHolds(
  page: Page,
  change?: (holds: MockHolds) => void,
): Promise<{ notifications: MockNotifications; holds: MockHolds }> {
  const notifications = await theMockNotifications(page);
  const holds = mockHolds();
  change?.(holds);
  await page.route('**/photos/grace.jpg', (route) => route.fulfill({ path: gracePhoto }));
  await page.route('**/api/admin/notifications/holds', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: holds }) : route.fallback(),
  );
  await page.route('**/api/admin/notifications/holds/popkin-search**', (route) => {
    const text = (new URL(route.request().url()).searchParams.get('q') ?? '').trim().toLowerCase();
    const found = mockHoldMatches().filter(
      (m) => !text || m.name.toLowerCase().includes(text) || m.inviteCode.toLowerCase() === text,
    );
    return route.fulfill({ json: found });
  });
  return { notifications, holds };
}
