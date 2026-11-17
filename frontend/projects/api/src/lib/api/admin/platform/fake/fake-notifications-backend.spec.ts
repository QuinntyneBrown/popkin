import { describe, expect, it } from 'vitest';
import {
  AdminMe,
  AdminNotificationHolds,
  AdminNotificationKind,
  AdminNotifications,
  HoldPopkinMatch,
} from '../../../../models/admin';
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

describe('FakeNotificationsBackend defaults (L2-173)', () => {
  const put = (fake: FakeNotificationsBackend, body: object, admin: FakeRequest['admin'] = owner) =>
    fake.handle(request('PUT', '/api/admin/notifications/defaults', body, admin))!;
  const code = (answer: { body: unknown }) => (answer.body as { code: string }).code;

  it('reads the first values', () => {
    expect(backend().handle(request('GET', '/api/admin/notifications/defaults'))!.body).toEqual({
      activityEmail: 'AsItHappens',
      bundleMinutes: 10,
      mostEmailsPerDay: 12,
      quietFrom: '21:00',
      quietTo: '08:00',
      birthdayLead: 'OneWeekBefore',
      changedAt: null,
      changedByName: null,
    });
  });

  it('saves new defaults with who changed them', () => {
    const fake = backend();
    const answer = put(fake, { activityEmail: 'DailyDigest', bundleMinutes: 20, reason: 'Fewer' });
    expect(answer.status).toBe(200);
    expect(answer.body).toMatchObject({
      activityEmail: 'DailyDigest',
      bundleMinutes: 20,
      changedByName: 'Lena Fischer',
      changedAt: now.toISOString(),
    });
  });

  // One case per refusal.
  it.each([
    [{ bundleMinutes: 0, reason: 'x' }, 400, 'default_not_allowed'],
    [{ mostEmailsPerDay: 101, reason: 'x' }, 400, 'default_not_allowed'],
    [{ quietFrom: '21:15', reason: 'x' }, 400, 'default_not_allowed'],
    [{ birthdayLead: 'TwoWeeksBefore', reason: 'x' }, 400, 'default_not_allowed'],
    [{ bundleMinutes: 10, reason: 'x' }, 400, 'no_change'],
    [{ bundleMinutes: 20, reason: ' ' }, 400, 'reason_required'],
  ])('refuses %o with %i %s', (body, status, refusal) => {
    const answer = put(backend(), body);
    expect(answer.status).toBe(status);
    expect(code(answer)).toBe(refusal);
  });

  it('names the field a value is wrong for', () => {
    const answer = put(backend(), { bundleMinutes: 61, reason: 'x' });
    expect((answer.body as { title: string }).title).toBe(
      'bundleMinutes: Enter a whole number from 1 to 60.',
    );
  });

  it.each([
    ['Support', { name: 'Aiko Tanaka', role: 'Support' as const }],
    ['Viewer', { name: 'Sam Ortiz', role: 'Viewer' as const }],
  ])('refuses %s (L2-173 AC5)', (_, admin) => {
    expect(code(put(backend(), { bundleMinutes: 20, reason: 'x' }, admin))).toBe(
      'role_not_allowed',
    );
  });
});

describe('FakeNotificationsBackend holds (L2-172)', () => {
  const support = { name: 'Aiko Tanaka', role: 'Support' as const };
  const viewer = { name: 'Sam Ortiz', role: 'Viewer' as const };
  const holds = (fake: FakeNotificationsBackend) =>
    fake.handle(request('GET', '/api/admin/notifications/holds'))!.body as AdminNotificationHolds;
  const search = (fake: FakeNotificationsBackend, q: string) =>
    (
      fake.handle({
        ...request('GET', '/api/admin/notifications/holds/popkin-search'),
        query: { q },
      })!.body as HoldPopkinMatch[]
    ).map((m) => m.name);
  const hold = (
    fake: FakeNotificationsBackend,
    popkinId: string,
    admin: FakeRequest['admin'] = owner,
    reason = 'Spam',
  ) => fake.handle(request('POST', '/api/admin/notifications/holds', { popkinId, reason }, admin))!;
  const release = (
    fake: FakeNotificationsBackend,
    id: string,
    admin: FakeRequest['admin'] = owner,
    reason = 'Done',
  ) =>
    fake.handle(
      request('POST', `/api/admin/notifications/holds/${id}/release`, { reason }, admin),
    )!;

  it('lists manual holds first, then automatic, newest first, and counts them', () => {
    const fake = backend();
    const list = holds(fake);
    expect(list.holds.map((h) => h.popkin?.name ?? h.person?.name)).toEqual([
      'Class of 2015 Reunion',
      'Priya Nair',
      'Ruth Lindqvist',
      'Grace Adeyemi',
    ]);
    expect(list.holds.filter((h) => h.automatic).every((h) => h.id === null)).toBe(true);
    expect(list.suppressedAddresses).toBeNull();
    expect(read(fake).holdCount).toBe(4);
  });

  it.each([
    [
      '',
      [
        'Bakery Launch Crew',
        'Hackathon Team Owl',
        'Lakeside Weekend',
        'Sunday Brunch Club',
        'U10 Hornets Parents',
      ],
    ],
    ['brunch', ['Sunday Brunch Club']],
    ['pine-4821', ['Lakeside Weekend']],
    ['PINE', []],
    ['reunion', []],
    ['camp', []],
  ])('searches "%s": active, not held, by name or whole code', (q, names) => {
    expect(search(backend(), q)).toEqual(names);
  });

  // One case per refusal of a hold.
  it.each([
    ['popkin-nowhere', 404, 'popkin_not_found'],
    ['popkin-camp', 409, 'popkin_wrapped_up'],
    ['popkin-reunion', 409, 'popkin_already_held'],
  ])('refuses to hold %s with %i %s', (popkinId, status, code) => {
    const answer = hold(backend(), popkinId);
    expect(answer.status).toBe(status);
    expect((answer.body as { code: string }).code).toBe(code);
  });

  it('lets Support hold a Popkin, which then leaves the search', () => {
    const fake = backend();
    const answer = hold(fake, 'popkin-bakery', support, 'Spam invites');
    expect(answer.status).toBe(201);
    expect(answer.body).toMatchObject({
      target: 'Popkin',
      automatic: false,
      why: 'Spam invites',
      byName: 'Aiko Tanaka',
      until: 'UntilReleased',
      popkin: { name: 'Bakery Launch Crew', inviteCode: 'CRMB-0093' },
    });
    expect(holds(fake).holds[0].popkin?.name).toBe('Bakery Launch Crew');
    expect(search(fake, 'bakery')).toEqual([]);
    expect(read(fake).holdCount).toBe(5);
  });

  it('releases a hold by hand once, and the Popkin can be found again', () => {
    const fake = backend();
    expect(release(fake, 'hold-reunion', support).status).toBe(200);
    expect(search(fake, 'reunion')).toEqual(['Class of 2015 Reunion']);
    expect((release(fake, 'hold-reunion').body as { code: string }).code).toBe('hold_not_found');
  });

  it('refuses a Viewer both, and asks everyone for a reason (L2-172 AC7, L2-087)', () => {
    const fake = backend();
    expect((hold(fake, 'popkin-bakery', viewer).body as { code: string }).code).toBe(
      'role_not_allowed',
    );
    expect((release(fake, 'hold-reunion', viewer).body as { code: string }).code).toBe(
      'role_not_allowed',
    );
    expect((hold(fake, 'popkin-bakery', owner, ' ').body as { code: string }).code).toBe(
      'reason_required',
    );
  });
});
