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
