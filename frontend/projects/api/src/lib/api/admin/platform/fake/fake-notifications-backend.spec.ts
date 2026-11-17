import { describe, expect, it } from 'vitest';
import { AdminMe, AdminNotificationKind, AdminNotifications } from '../../../../models/admin';
import { FakeNotificationsBackend, FakeRequest } from './fake-notifications-backend';

const now = new Date('2026-07-14T11:00:00Z');
const owner = { name: 'Lena Fischer', role: 'Owner' as const };

const request = (
  method: string,
  path: string,
  body: unknown = null,
  admin: FakeRequest['admin'] = owner,
): FakeRequest => ({ method, path, body, admin });

const backend = () => new FakeNotificationsBackend(() => now);
const read = (fake: FakeNotificationsBackend) =>
  fake.handle(request('GET', '/api/admin/notifications'))!.body as AdminNotifications;
const kindOf = (fake: FakeNotificationsBackend, id: string) =>
  read(fake)
    .groups.flatMap((g) => g.kinds)
    .find((k) => k.kind === id)!;

describe('FakeNotificationsBackend (ADR 0030)', () => {
  it('reads the twelve kinds of L2-154 in three groups, opens not counted (gap 129)', () => {
    const page = read(backend());
    expect(page.groups.map((g) => g.name)).toEqual([
      'When something changes',
      'Reminders',
      'Your account',
    ]);
    expect(page.groups.flatMap((g) => g.kinds)).toHaveLength(12);
    expect(page.groups.flatMap((g) => g.kinds).every((k) => k.openedPercent === null)).toBe(true);
    expect(page.status.paused).toBe(false);
  });

  it('leaves every other path to the API', () => {
    expect(backend().handle(request('GET', '/api/admin/features'))).toBeNull();
    expect(backend().handle(request('DELETE', '/api/admin/notifications'))).toBeNull();
  });

  it.each([
    ['Owner', ['ExportAuditLog', 'ManageNotifications', 'HoldNotifications']],
    ['Support', ['ExportAuditLog', 'HoldNotifications']],
    ['Viewer', ['ExportAuditLog']],
  ])('adds what a %s may do to the signed-in admin (L2-086)', (role, allowed) => {
    const me = { role, allowed: ['ExportAuditLog'] } as AdminMe;
    expect(backend().allowedFor(me)).toEqual(allowed);
  });

  // One case per row of the guard: role, then reason, then the action.
  it.each([
    [{ name: 'Aiko', role: 'Support' as const }, 'why', 403, 'role_not_allowed'],
    [{ name: 'Hannah', role: 'Viewer' as const }, 'why', 403, 'role_not_allowed'],
    [null, 'why', 403, 'role_not_allowed'],
    [owner, '   ', 400, 'reason_required'],
    [owner, 'x'.repeat(501), 400, 'reason_too_long'],
  ])('refuses a pause by %o with reason %#', (admin, reason, status, code) => {
    const answer = backend().handle(
      request('POST', '/api/admin/notifications/pause', { reason }, admin),
    );
    expect(answer).toEqual({ status, body: { status, title: code, code } });
  });

  it('pauses with who and why, refuses a second pause, and resumes (L2-170)', () => {
    const fake = backend();
    const paused = fake.handle(
      request('POST', '/api/admin/notifications/pause', { reason: ' Digest twice ' }),
    )!;
    expect(paused.status).toBe(200);
    expect(paused.body).toMatchObject({
      paused: true,
      pausedAt: now.toISOString(),
      pausedByName: 'Lena Fischer',
      pauseReason: 'Digest twice',
    });
    expect(read(fake).status.paused).toBe(true);
    expect(
      fake.handle(request('POST', '/api/admin/notifications/pause', { reason: 'again' }))!.body,
    ).toMatchObject({ code: 'email_already_paused' });

    expect(
      fake.handle(request('POST', '/api/admin/notifications/resume', { reason: 'Fixed' }))!.body,
    ).toMatchObject({ paused: false, pauseReason: null });
    expect(
      fake.handle(request('POST', '/api/admin/notifications/resume', { reason: 'Fixed' }))!.body,
    ).toMatchObject({ code: 'email_not_paused' });
  });

  it('switches a kind off for everyone with who and why, and back on (L2-171)', () => {
    const fake = backend();
    const off = fake.handle(
      request('PUT', '/api/admin/notifications/kinds/NewPhotos', { on: false, reason: 'Twice' }),
    )!;
    expect(off.body).toMatchObject<Partial<AdminNotificationKind>>({
      offForEveryone: true,
      offSince: now.toISOString(),
      offByName: 'Lena Fischer',
      offReason: 'Twice',
    });
    expect(kindOf(fake, 'NewPhotos').offForEveryone).toBe(true);

    fake.handle(
      request('PUT', '/api/admin/notifications/kinds/NewPhotos', { on: true, reason: 'Fixed' }),
    );
    expect(kindOf(fake, 'NewPhotos')).toMatchObject({ offForEveryone: false, offReason: null });
  });

  it.each([
    ['SignInAndSecurity', 400, 'notification_required'],
    ['Nothing', 404, 'notification_kind_not_found'],
  ])('refuses switching %s', (kind, status, code) => {
    const answer = backend().handle(
      request('PUT', `/api/admin/notifications/kinds/${kind}`, { on: false, reason: 'why' }),
    );
    expect(answer).toMatchObject({ status, body: { code } });
  });

  it('answers a switch to the state a kind already has without changing who set it', () => {
    const fake = backend();
    const answer = fake.handle(
      request('PUT', '/api/admin/notifications/kinds/Experiences', { on: false, reason: 'again' }),
    )!;
    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({ offReason: 'Rating emails firing on every star change' });
  });

  it('hands out copies, so a caller cannot change what it keeps', () => {
    const fake = backend();
    read(fake).groups[0].kinds[0].name = 'Changed';
    expect(read(fake).groups[0].kinds[0].name).toBe('Mentions and replies');
  });
});
