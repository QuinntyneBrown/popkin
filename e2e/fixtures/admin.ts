import type { Page } from '@playwright/test';
import { recordedBody } from './stubs';

interface RecordedAudit {
  entries: { at: string }[];
}

/** An hour after the newest recorded audit entry, so the recorded actions were "Today". */
export const adminNow = new Date(
  new Date(recordedBody<RecordedAudit>('GET /api/admin/audit').entries[0].at).getTime() + 3_600_000,
);

/** The console as the recording left it: the clock an hour after its last action. */
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

/** The console as an admin of `role` sees it: the recorded admin with that role's actions. */
export async function signedInAs(page: Page, role: 'Support' | 'Viewer'): Promise<void> {
  const allowed =
    role === 'Viewer' ? ['ExportAuditLog'] : recordedMe.allowed.filter((a) => a !== 'ManageAdmins');
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
