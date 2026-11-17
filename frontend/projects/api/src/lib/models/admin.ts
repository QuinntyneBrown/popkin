import { PopkinFeature } from './home';
/** The admin app's answers (docs/detailed-designs/admin-access). */

export type AdminRole = 'Owner' | 'Support' | 'Viewer';

/** What a role may do (L2-086); the console disables what the signed-in admin's role does not allow. */
export type AdminAction =
  | 'SuspendPerson'
  | 'SignPersonOut'
  | 'ExportPersonData'
  | 'LogDataRequest'
  | 'StartDeletion'
  | 'CancelDeletion'
  | 'WrapUpPopkin'
  | 'ExtendPopkin'
  | 'RemoveMember'
  | 'ResetInvite'
  | 'ReviewReports'
  | 'RemoveContent'
  | 'OpenModerationView'
  | 'EndCall'
  | 'RunJob'
  | 'RetryExport'
  | 'ChangeFeature'
  | 'ChangeLimits'
  | 'PublishAnnouncement'
  | 'ManageNotifications'
  | 'HoldNotifications'
  | 'ManageAdmins'
  | 'ExportAuditLog'
  | (string & {});

/** `GET /api/admin/me`: the signed-in admin and what their role allows. */
export interface AdminMe {
  adminId: string;
  name: string;
  email: string;
  role: AdminRole;
  allowed: AdminAction[];
}

/** A code sent to a staff email; the same answer for every whole address (L2-088 AC3). */
export interface AdminCodeSent {
  verificationId: string;
  sentTo: string;
  expiresAt: string;
  resendAvailableAt: string;
}

/** One action taken in the console (L2-120). */
export interface AuditEntry {
  id: number;
  at: string;
  /** Null for an action Popkin took itself, such as adding the first Owner. */
  adminId: string | null;
  adminName: string;
  action: string;
  actionLabel: string;
  targetKind: string;
  targetId: string;
  targetName: string;
  reason: string | null;
  /** A JSON object of what changed, such as `{ "from": "Support", "to": "Viewer" }`. */
  details: string;
}

/** A page of the audit log, newest first; `next` continues after its last entry. */
export interface AuditPage {
  entries: AuditEntry[];
  total: number;
  next: string | null;
}

export interface AuditQuery {
  search?: string;
  adminId?: string;
  before?: string;
}

/** An admin as Admins & roles lists them (L2-119 AC1). */
export interface AdminRow {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  invited: boolean;
  lastActiveAt: string | null;
  isYou: boolean;
  isLastOwner: boolean;
}

export interface AdminList {
  count: number;
  admins: AdminRow[];
}

/** A row of what each role can do, as `GET /api/admin/roles` keys it (L2-086 AC4). */
export interface AdminPermissionRowView {
  row: string;
  owner: boolean;
  support: boolean;
  viewer: boolean;
}

export interface AdminRolesView {
  counts: { owner: number; support: number; viewer: number };
  rows: AdminPermissionRowView[];
}

/** Who has a feature: nobody, the chosen Popkins only, or every Popkin. */
export type FeatureMode = 'Off' | 'Chosen' | 'Everyone';

export interface ChosenPopkin {
  popkinId: string;
  name: string;
  emoji: string;
  colour: string;
}

/** One panel of the Features page (L2-076 AC1, AC5). */
export interface AdminFeature {
  feature: PopkinFeature;
  mode: FeatureMode;
  /** How many live Popkins there are, for "On in all {n} live Popkins." */
  livePopkins: number;
  chosen: ChosenPopkin[];
  /** Null for a switch nobody has set. */
  changedAt: string | null;
  changedByName: string | null;
}

export interface AdminFeatures {
  features: AdminFeature[];
}

/** A live Popkin the add dialog found (L2-076 AC6). */
export interface FeaturePopkinMatch {
  popkinId: string;
  name: string;
  emoji: string;
  colour: string;
  inviteCode: string;
  alreadyOn: boolean;
}

/** A kind of notification (L2-154). */
export type NotificationKindId =
  | 'MentionsAndReplies'
  | 'DirectMessages'
  | 'GroupChat'
  | 'NewPhotos'
  | 'PlanChanges'
  | 'ScheduleChanges'
  | 'PeopleJoining'
  | 'Experiences'
  | 'Birthdays'
  | 'StoriesDue'
  | 'PopkinWrappingUp'
  | 'SignInAndSecurity';

export type NotificationGroupId = 'Activity' | 'Reminders' | 'Account';

/** Whether member email is going out (L2-169 AC2, AC3). A figure not counted yet is null. */
export interface AdminSendStatus {
  paused: boolean;
  pausedAt: string | null;
  pausedByName: string | null;
  pauseReason: string | null;
  queued: number;
  /** About how long the queue takes to send once resumed. */
  resumeMinutes: number | null;
  sentToday: number;
  bouncedPercent: number | null;
  medianSecondsToInbox: number | null;
}

/** One kind on the Kinds tab (L2-169 AC4, L2-171 AC2). */
export interface AdminNotificationKind {
  kind: NotificationKindId;
  name: string;
  about: string;
  /** "Sign-in codes and security": it cannot be switched off (L2-154 AC2). */
  required: boolean;
  offForEveryone: boolean;
  offSince: string | null;
  offByName: string | null;
  offReason: string | null;
  sent24h: number;
  openedPercent: number | null;
}

export interface AdminNotificationGroup {
  group: NotificationGroupId;
  name: string;
  kinds: AdminNotificationKind[];
}

/** `GET /api/admin/notifications` (docs/detailed-designs/admin-platform/notifications). */
export interface AdminNotifications {
  status: AdminSendStatus;
  groups: AdminNotificationGroup[];
  holdCount: number;
}

/** Until when a hold lasts (L2-172 AC1). */
export type NotificationHoldUntil = 'UntilReleased' | 'WhileSuspended' | 'UntilDeleted';

/** The Popkin a hold is on. */
export interface AdminHoldPopkin {
  id: string;
  name: string;
  emoji: string;
  colour: string;
  members: number;
  inviteCode: string;
}

/** The person a hold is on. */
export interface AdminHoldPerson {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

/**
 * One hold (docs/detailed-designs/admin-platform/notification-holds). An automatic hold has no
 * id, is by "System" and cannot be released here (L2-172 AC5).
 */
export interface AdminNotificationHold {
  id: string | null;
  target: 'Popkin' | 'Person';
  automatic: boolean;
  popkin: AdminHoldPopkin | null;
  person: AdminHoldPerson | null;
  why: string;
  byName: string;
  since: string;
  until: NotificationHoldUntil;
}

/** `GET /api/admin/notifications/holds`: manual holds first, then automatic, newest first. */
export interface AdminNotificationHolds {
  holds: AdminNotificationHold[];
  /** The mail provider's count of hard-bounced addresses; null until gap 129 is settled. */
  suppressedAddresses: number | null;
}

/** An active Popkin not already held, as "Hold a Popkin" finds it (L2-172 AC2). */
export interface HoldPopkinMatch {
  popkinId: string;
  name: string;
  emoji: string;
  colour: string;
  inviteCode: string;
}
