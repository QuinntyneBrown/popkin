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
