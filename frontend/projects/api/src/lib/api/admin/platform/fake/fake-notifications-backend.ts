import {
  AdminAction,
  AdminMe,
  AdminNotificationGroup,
  AdminNotificationKind,
  AdminNotifications,
  AdminSendStatus,
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

/**
 * The admin notification endpoints, answered from memory (ADR 0030). It keeps the rules the
 * designs give the API: the role check, a required reason of at most 500 characters, and each
 * refusal's `code`. Its state lasts until the page is reloaded.
 */
export class FakeNotificationsBackend {
  private readonly status: AdminSendStatus;
  private readonly groups: AdminNotificationGroup[];
  private readonly holdCount = 4;

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
    return null;
  }

  private read(): AdminNotifications {
    return structuredClone({ status: this.status, groups: this.groups, holdCount: this.holdCount });
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
