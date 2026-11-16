import type { Page } from '@playwright/test';
import { recordedBody } from './stubs';

interface RecordedAudit {
  entries: { at: string }[];
}

/**
 * A minute after the newest recorded audit entry, so the recorded actions were "Today" in London
 * even when the recording ran late in the evening.
 */
export const adminNow = new Date(
  new Date(recordedBody<RecordedAudit>('GET /api/admin/audit').entries[0].at).getTime() + 60_000,
);

/** The console as the recording left it: the clock a minute after its last action. */
export async function atTheRecording(page: Page): Promise<void> {
  await page.clock.setFixedTime(adminNow);
}

interface RecordedCode {
  verificationId: string;
}

/** The recorded code request, whose id the code step confirms. */
export const recordedAdminCode = recordedBody<RecordedCode>('POST /api/admin/auth/codes');

/** `POST …/confirm` of the recorded code, the key a stub of the code step answers. */
export const confirmKey = `POST /api/admin/auth/codes/${recordedAdminCode.verificationId}/confirm`;

/**
 * No admin session until a code is confirmed: `GET /api/admin/me` answers 401, then the
 * recording once the confirm has been answered from it (L2-088 AC4). A stub a test adds later
 * answers the confirm before this route sees it, so a refused code leaves the session absent.
 */
export async function signedOutOfTheConsole(page: Page): Promise<void> {
  let signedIn = false;
  await page.route('**/api/admin/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST' && path.endsWith('/confirm')) {
      signedIn = true;
      return route.fallback();
    }
    if (request.method() === 'GET' && path === '/api/admin/me' && !signedIn) {
      return route.fulfill({ status: 401 });
    }
    return route.fallback();
  });
}

export interface RecordedAuditEntry {
  id: number;
  adminId: string | null;
  adminName: string;
  targetName: string;
}

/** The recorded audit log, newest first: three admins added by Lena, and Lena added by Popkin. */
export const recordedAudit = recordedBody<{ entries: RecordedAuditEntry[]; total: number }>(
  'GET /api/admin/audit',
);

interface RecordedAdmins {
  admins: { id: string; name: string }[];
}

/** The recorded admins, the caller first: Lena Fischer, then by name. */
export const recordedAdmins = recordedBody<RecordedAdmins>('GET /api/admin/admins').admins;

/** A page of the audit log holding `entries`, with `next` when older ones remain. */
export function auditPage(
  entries: RecordedAuditEntry[],
  total = entries.length,
  next: string | null = null,
) {
  return { status: 200, body: { entries, total, next } };
}

/** The recorded signed-in admin, an Owner. */
export const recordedMe = recordedBody<{ adminId: string; role: string; allowed: string[] }>(
  'GET /api/admin/me',
);

/** What only an Owner may do (L2-086): deletions, the platform and the admins. */
const OWNER_ONLY = [
  'StartDeletion',
  'CancelDeletion',
  'ChangeFeature',
  'ChangeLimits',
  'PublishAnnouncement',
  'ManageAdmins',
];

/** The console as an admin of `role` sees it: the recorded admin with that role's actions. */
export async function signedInAs(page: Page, role: 'Support' | 'Viewer'): Promise<void> {
  const allowed =
    role === 'Viewer'
      ? ['ExportAuditLog']
      : recordedMe.allowed.filter((a) => !OWNER_ONLY.includes(a));
  await page.route('**/api/admin/me', (route) =>
    route.fulfill({ status: 200, json: { ...recordedMe, role, allowed } }),
  );
}

/** The five admins the Admins & roles mocks draw, with Lena signed in, at noon on 14 July. */
export async function theMockAdmins(page: Page): Promise<void> {
  const now = new Date('2026-07-14T12:00:00+01:00');
  await page.clock.setFixedTime(now);
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  const admin = (
    name: string,
    role: string,
    lastActiveAt: string | null,
    extra: { isYou?: boolean; invited?: boolean } = {},
  ) => ({
    id: `mock-${name.split(' ')[0].toLowerCase()}`,
    name,
    email: `${name.split(' ')[0].toLowerCase()}@popkin.app`,
    role,
    invited: extra.invited ?? false,
    lastActiveAt,
    isYou: extra.isYou ?? false,
    isLastOwner: false,
  });
  const admins = [
    admin('Lena Fischer', 'Owner', ago(0), { isYou: true }),
    admin('Kwame Mensah', 'Owner', ago(120)),
    admin('Aiko Tanaka', 'Support', ago(14)),
    admin('Marco Bianchi', 'Support', ago(24 * 60)),
    admin('Hannah Cole', 'Viewer', '2026-07-09T10:00:00+01:00'),
  ];
  const roles = recordedBody<{ rows: unknown[] }>('GET /api/admin/roles');
  await page.route('**/api/admin/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== 'GET') return route.fallback();
    if (path === '/api/admin/admins') {
      return route.fulfill({ json: { count: admins.length, admins } });
    }
    if (path === '/api/admin/roles') {
      return route.fulfill({ json: { ...roles, counts: { owner: 2, support: 2, viewer: 1 } } });
    }
    return route.fallback();
  });
}

/** A Popkin the features mocks name, as a chosen Popkin of a switch. */
export const mockPopkin = (name: string, emoji: string, colour: string, code = '') => ({
  popkinId: `mock-${name.split(' ')[0].toLowerCase()}`,
  name,
  emoji,
  colour,
  inviteCode: code,
});

/** The chosen Popkins of Schedules in the features mocks. */
export const mockChosen = [
  mockPopkin('Lakeside Weekend', '🏕️', 'Teal', 'LAKE-0148'),
  mockPopkin('Sunday Brunch Club', '🥞', 'Coral', 'BRUN-0712'),
  mockPopkin('Algarve Girls Weekend', '🏖️', 'Sky', 'ALGV-2207'),
];

/**
 * The Features page of the mocks at noon on 14 July: Plan on for everyone since 1 July, and
 * Schedules on in three chosen Popkins since 10:21 that morning, both set by Lena Fischer.
 * `change` alters the answer before it is sent.
 */
export async function theMockFeatures(
  page: Page,
  change?: (features: MockFeature[]) => void,
): Promise<MockFeature[]> {
  // A running clock, so the add dialog's search waits its 300 ms; local times, so the page
  // reads the mocks' hours in any time zone.
  await page.clock.install({ time: new Date(2026, 6, 14, 12, 0) });
  const features: MockFeature[] = [
    {
      feature: 'Plan',
      mode: 'Everyone',
      livePopkins: 3112,
      chosen: [],
      changedAt: new Date(2026, 6, 1, 9, 30).toISOString(),
      changedByName: 'Lena Fischer',
    },
    {
      feature: 'Schedules',
      mode: 'Chosen',
      livePopkins: 3112,
      chosen: mockChosen.map(({ popkinId, name, emoji, colour }) => ({
        popkinId,
        name,
        emoji,
        colour,
      })),
      changedAt: new Date(2026, 6, 14, 10, 21).toISOString(),
      changedByName: 'Lena Fischer',
    },
  ];
  change?.(features);
  await page.route('**/api/admin/features', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: { features } }) : route.fallback(),
  );
  return features;
}

export interface MockFeature {
  feature: 'Plan' | 'Schedules';
  mode: 'Off' | 'Chosen' | 'Everyone';
  livePopkins: number;
  chosen: { popkinId: string; name: string; emoji: string; colour: string }[];
  changedAt: string | null;
  changedByName: string | null;
}

/** Features after Schedules was turned off at 10:44, as `off.html` draws it. */
export const theMockFeaturesOff = async (page: Page): Promise<void> => {
  await theMockFeatures(page, (features) => {
    Object.assign(features[1], {
      mode: 'Off',
      chosen: [],
      changedAt: new Date(2026, 6, 14, 10, 44).toISOString(),
    });
  });
};

/** Features after Schedules was turned on for everyone at 10:44, as `everyone.html` draws it. */
export const theMockFeaturesForEveryone = async (page: Page): Promise<void> => {
  await theMockFeatures(page, (features) => {
    Object.assign(features[1], {
      mode: 'Everyone',
      chosen: [],
      changedAt: new Date(2026, 6, 14, 10, 44).toISOString(),
    });
  });
};

/** The four live Popkins the add dialog's mocks list for the search "a". */
export const mockMatches = [
  { ...mockPopkin('Class of 2015 Reunion', '🎓', 'Plum', 'GRAD-1507'), alreadyOn: false },
  { ...mockPopkin('Bakery Launch Crew', '🥐', 'Amber', 'CRMB-0093'), alreadyOn: false },
  { ...mockPopkin('Hackathon Team Owl', '🦉', 'Sky', 'OWLS-2238'), alreadyOn: false },
  { ...mockPopkin('U10 Hornets Parents', '⚽', 'Leaf', 'HRNT-5561'), alreadyOn: false },
];

/** The add dialog's search answers `matches` for any text. */
export async function searchingFeaturePopkins(
  page: Page,
  matches: unknown[] = mockMatches,
): Promise<void> {
  await page.route('**/api/admin/features/*/popkins/search**', (route) =>
    route.fulfill({ json: matches }),
  );
}
