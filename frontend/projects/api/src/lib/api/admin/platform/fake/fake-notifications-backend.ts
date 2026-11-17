import {
  AdminAction,
  AdminHoldPopkin,
  AdminMe,
  AdminNotificationGroup,
  AdminNotificationHold,
  AdminNotificationHolds,
  AdminNotificationKind,
  AdminNotifications,
  AdminSendStatus,
  HoldPopkinMatch,
  NotificationKindId,
} from '../../../../models/admin';
import { REASON_MAX_LENGTH } from '../../dialogs/action-dialog-state';

/** An answer the fake gives: a status and a body, a ProblemDetails for a refusal. */
export interface FakeAnswer {
  status: number;
  body: unknown;
}

/** A request the fake is asked: the admin's role and name come from the last `GET /api/admin/me`. */
export interface FakeRequest {
  method: string;
  path: string;
  /** The query string's values: the search's `q`. */
  query?: Record<string, string>;
  body: unknown;
  admin: Pick<AdminMe, 'name' | 'role'> | null;
}

const ok = (body: unknown, status = 200): FakeAnswer => ({ status, body });

/** A refusal as the API answers it, with the `code` a client branches on. */
export function problem(status: number, code: string, title = code): FakeAnswer {
  return { status, body: { status, title, code } };
}

/** What the notification actions need, by role (L2-086). */
const ALLOWS: Record<string, readonly AdminAction[]> = {
  Owner: ['ManageNotifications', 'HoldNotifications'],
  Support: ['HoldNotifications'],
  Viewer: [],
};

const kind = (
  id: NotificationKindId,
  name: string,
  about: string,
  sent24h: number,
  extra: Partial<AdminNotificationKind> = {},
): AdminNotificationKind => ({
  kind: id,
  name,
  about,
  required: false,
  offForEveryone: false,
  offSince: null,
  offByName: null,
  offReason: null,
  sent24h,
  // Opens are not counted until gap 129 is settled.
  openedPercent: null,
  ...extra,
});

/** The twelve kinds of L2-154, in their groups, with the mocks' counts. */
function seedGroups(now: Date): AdminNotificationGroup[] {
  const nineDaysAgo = new Date(now.getTime() - 9 * 24 * 3_600_000).toISOString();
  return [
    {
      group: 'Activity',
      name: 'When something changes',
      kinds: [
        kind(
          'MentionsAndReplies',
          'Mentions and replies',
          'Someone @mentions you or replies to you',
          9412,
        ),
        kind('DirectMessages', 'Direct messages', 'A message just to you', 6880),
        kind('GroupChat', 'Group chat', 'New messages in a Popkin’s chat', 4105),
        kind('NewPhotos', 'New photos', 'Photos added to an album', 7390),
        kind('PlanChanges', 'Plan changes', 'Stories added, moved or given to you', 5204),
        kind(
          'ScheduleChanges',
          'Schedule changes',
          'Someone books time off or the week shifts',
          1962,
        ),
        kind('PeopleJoining', 'People joining', 'Someone new joins a Popkin', 2418),
        kind('Experiences', 'Experiences', 'New places, ratings and comments', 0, {
          offForEveryone: true,
          offSince: nineDaysAgo,
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
        ),
        kind('StoriesDue', 'Stories due', 'The day before a story you own is due', 2233),
        kind('PopkinWrappingUp', 'Popkin wrapping up', '24 hours before a Popkin wraps up', 412),
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
          {
            required: true,
          },
        ),
      ],
    },
  ];
}

/** A Popkin the fake knows, and whether it has wrapped up. */
interface FakePopkin extends AdminHoldPopkin {
  wrappedUp: boolean;
}

const popkin = (
  id: string,
  name: string,
  emoji: string,
  colour: string,
  members: number,
  inviteCode: string,
  wrappedUp = false,
): FakePopkin => ({ id, name, emoji, colour, members, inviteCode, wrappedUp });

/** The Popkins of the mocks: one held, five to hold, one wrapped up. */
const seedPopkins = (): FakePopkin[] => [
  popkin('popkin-reunion', 'Class of 2015 Reunion', '🎓', 'Plum', 46, 'GRAD-1507'),
  popkin('popkin-bakery', 'Bakery Launch Crew', '🥐', 'Amber', 12, 'CRMB-0093'),
  popkin('popkin-brunch', 'Sunday Brunch Club', '🥞', 'Coral', 9, 'SYRP-7710'),
  popkin('popkin-lakeside', 'Lakeside Weekend', '🏕️', 'Teal', 14, 'PINE-4821'),
  popkin('popkin-owl', 'Hackathon Team Owl', '🦉', 'Sky', 6, 'OWLS-2201'),
  popkin('popkin-hornets', 'U10 Hornets Parents', '⚽', 'Leaf', 31, 'HRNT-0410'),
  popkin('popkin-camp', 'Summer Camp 2025', '🏕️', 'Leaf', 40, 'CAMP-2025', true),
];

const heldPart = (p: FakePopkin): AdminHoldPopkin => ({
  id: p.id,
  name: p.name,
  emoji: p.emoji,
  colour: p.colour,
  members: p.members,
  inviteCode: p.inviteCode,
});

/** The most matches the search gives (the design's `MaxMatches`). */
const MAX_MATCHES = 20;

/** The holds `holds.html` draws: two by hand, then two automatic. */
function seedHolds(now: Date, reunion: AdminHoldPopkin): AdminNotificationHold[] {
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 3_600_000).toISOString();
  const person = (id: string, name: string, email: string) => ({ id, name, email, avatar: null });
  return [
    {
      id: 'hold-reunion',
      target: 'Popkin',
      automatic: false,
      popkin: reunion,
      person: null,
      why: 'Reported for spam invites; 46 members, 3 reports',
      byName: 'Aiko Tanaka',
      since: daysAgo(2),
      until: 'UntilReleased',
    },
    {
      id: 'hold-priya',
      target: 'Person',
      automatic: false,
      popkin: null,
      person: person('person-priya', 'Priya Nair', 'priya.nair@fastmail.com'),
      why: 'Asked support to stop all mail while travelling',
      byName: 'Aiko Tanaka',
      since: daysAgo(4),
      until: 'UntilReleased',
    },
    {
      id: null,
      target: 'Person',
      automatic: true,
      popkin: null,
      person: person('person-ruth', 'Ruth Lindqvist', 'ruth.lindqvist@proton.me'),
      why: 'Account suspended',
      byName: 'System',
      since: daysAgo(8),
      until: 'WhileSuspended',
    },
    {
      id: null,
      target: 'Person',
      automatic: true,
      popkin: null,
      person: person('person-grace', 'Grace Adeyemi', 'grace.adeyemi@gmail.com'),
      why: 'Account being deleted',
      byName: 'System',
      since: daysAgo(13),
      until: 'UntilDeleted',
    },
  ];
}

/**
 * The admin notification endpoints, answered from memory (ADR 0030). It keeps the rules the
 * designs give the API: the role check, a required reason of at most 500 characters, and each
 * refusal's `code`. Its state lasts until the page is reloaded.
 */
export class FakeNotificationsBackend {
  private readonly status: AdminSendStatus;
  private readonly groups: AdminNotificationGroup[];
  private readonly popkins = seedPopkins();
  private holds: AdminNotificationHold[];
  private nextHold = 1;

  constructor(private readonly clock: () => Date = () => new Date()) {
    this.status = {
      paused: false,
      pausedAt: null,
      pausedByName: null,
      pauseReason: null,
      queued: 0,
      resumeMinutes: null,
      sentToday: 48210,
      bouncedPercent: null,
      medianSecondsToInbox: 41,
    };
    this.groups = seedGroups(this.clock());
    this.holds = seedHolds(this.clock(), heldPart(this.popkins[0]));
  }

  /** The `allowed` of `GET /api/admin/me`, with what the admin's role may do here. */
  allowedFor(me: AdminMe): AdminAction[] {
    const extra = (ALLOWS[me.role] ?? []).filter((a) => !me.allowed.includes(a));
    return [...me.allowed, ...extra];
  }

  /** Answers a request under `/api/admin/notifications`, or `null` for any other path. */
  handle(request: FakeRequest): FakeAnswer | null {
    const path = request.path.replace(/\/+$/, '');
    const { method } = request;
    if (path === '/api/admin/notifications' && method === 'GET') return ok(this.read());
    if (path === '/api/admin/notifications/pause' && method === 'POST') {
      return this.guarded(request, 'ManageNotifications', (reason, admin) =>
        this.pause(reason, admin),
      );
    }
    if (path === '/api/admin/notifications/resume' && method === 'POST') {
      return this.guarded(request, 'ManageNotifications', () => this.resume());
    }
    const switchKind = /^\/api\/admin\/notifications\/kinds\/([A-Za-z]+)$/.exec(path);
    if (switchKind && method === 'PUT') {
      const on = (request.body as { on?: unknown } | null)?.on === true;
      return this.guarded(request, 'ManageNotifications', (reason, admin) =>
        this.switchKind(switchKind[1], on, reason, admin),
      );
    }
    if (path === '/api/admin/notifications/holds' && method === 'GET') {
      return ok(this.readHolds());
    }
    if (path === '/api/admin/notifications/holds/popkin-search' && method === 'GET') {
      return ok(this.search(request.query?.['q'] ?? ''));
    }
    if (path === '/api/admin/notifications/holds' && method === 'POST') {
      const popkinId = String((request.body as { popkinId?: unknown } | null)?.popkinId ?? '');
      return this.guarded(request, 'HoldNotifications', (reason, admin) =>
        this.hold(popkinId, reason, admin),
      );
    }
    const release = /^\/api\/admin\/notifications\/holds\/([^/]+)\/release$/.exec(path);
    if (release && method === 'POST') {
      return this.guarded(request, 'HoldNotifications', () => this.release(release[1]));
    }
    return null;
  }

  private read(): AdminNotifications {
    return structuredClone({
      status: this.status,
      groups: this.groups,
      holdCount: this.holds.length,
    });
  }

  /** Manual holds first, then automatic, each newest first (the design's order). */
  private readHolds(): AdminNotificationHolds {
    const newest = (a: AdminNotificationHold, b: AdminNotificationHold) =>
      b.since.localeCompare(a.since);
    const manual = this.holds.filter((h) => !h.automatic).sort(newest);
    const automatic = this.holds.filter((h) => h.automatic).sort(newest);
    // The provider's count is unknown until gap 129 is settled.
    return structuredClone({ holds: [...manual, ...automatic], suppressedAddresses: null });
  }

  private isHeld(popkinId: string): boolean {
    return this.holds.some((h) => h.popkin?.id === popkinId);
  }

  /** Active Popkins not held whose name contains the text or whose code is it, by name. */
  private search(text: string): HoldPopkinMatch[] {
    const wanted = text.trim().toLowerCase();
    const matches = (p: FakePopkin) =>
      !wanted || p.name.toLowerCase().includes(wanted) || p.inviteCode.toLowerCase() === wanted;
    return this.popkins
      .filter((p) => !p.wrappedUp && !this.isHeld(p.id) && matches(p))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, MAX_MATCHES)
      .map(({ id, name, emoji, colour, inviteCode }) => ({
        popkinId: id,
        name,
        emoji,
        colour,
        inviteCode,
      }));
  }

  private hold(popkinId: string, reason: string, admin: string): FakeAnswer {
    const found = this.popkins.find((p) => p.id === popkinId);
    if (!found) return problem(404, 'popkin_not_found');
    if (found.wrappedUp) return problem(409, 'popkin_wrapped_up');
    if (this.isHeld(popkinId)) return problem(409, 'popkin_already_held');
    const hold: AdminNotificationHold = {
      id: `hold-${this.nextHold++}`,
      target: 'Popkin',
      automatic: false,
      popkin: heldPart(found),
      person: null,
      why: reason,
      byName: admin,
      since: this.clock().toISOString(),
      until: 'UntilReleased',
    };
    this.holds.push(hold);
    return ok(structuredClone(hold), 201);
  }

  private release(holdId: string): FakeAnswer {
    const found = this.holds.find((h) => h.id === holdId);
    if (!found) return problem(404, 'hold_not_found');
    this.holds = this.holds.filter((h) => h !== found);
    return ok(null);
  }

  /** The role, then the reason (L2-086, L2-087), then the action. */
  private guarded(
    request: FakeRequest,
    action: AdminAction,
    act: (reason: string, admin: string) => FakeAnswer,
  ): FakeAnswer {
    const role = request.admin?.role ?? 'Viewer';
    if (!(ALLOWS[role] ?? []).includes(action)) return problem(403, 'role_not_allowed');
    const reason = String((request.body as { reason?: unknown } | null)?.reason ?? '').trim();
    if (!reason) return problem(400, 'reason_required');
    if (reason.length > REASON_MAX_LENGTH) return problem(400, 'reason_too_long');
    return act(reason, request.admin?.name ?? 'An admin');
  }

  private pause(reason: string, admin: string): FakeAnswer {
    if (this.status.paused) return problem(409, 'email_already_paused');
    Object.assign(this.status, {
      paused: true,
      pausedAt: this.clock().toISOString(),
      pausedByName: admin,
      pauseReason: reason,
      queued: 0,
      resumeMinutes: 1,
    });
    return ok(structuredClone(this.status));
  }

  private resume(): FakeAnswer {
    if (!this.status.paused) return problem(409, 'email_not_paused');
    Object.assign(this.status, {
      paused: false,
      pausedAt: null,
      pausedByName: null,
      pauseReason: null,
      queued: 0,
      resumeMinutes: null,
    });
    return ok(structuredClone(this.status));
  }

  private switchKind(id: string, on: boolean, reason: string, admin: string): FakeAnswer {
    const found = this.groups.flatMap((g) => g.kinds).find((k) => k.kind === id);
    if (!found) return problem(404, 'notification_kind_not_found');
    if (found.required) return problem(400, 'notification_required');
    if (found.offForEveryone === !on) return ok(structuredClone(found));
    Object.assign(
      found,
      on
        ? { offForEveryone: false, offSince: null, offByName: null, offReason: null }
        : {
            offForEveryone: true,
            offSince: this.clock().toISOString(),
            offByName: admin,
            offReason: reason,
          },
    );
    return ok(structuredClone(found));
  }
}
