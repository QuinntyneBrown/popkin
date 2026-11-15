import { AdminAction, AdminRole } from '../../../models/admin';

/** The notice above every page for a Viewer (L2-086 AC3). */
export const VIEWER_NOTICE =
  'You’re signed in as a Viewer. You can look at everything; actions are switched off.';

/**
 * Why an action is switched off for the signed-in admin, or `null` when their role allows it
 * (L2-086 AC2): a Viewer changes nothing; a Support admin is refused what only Owners do.
 */
export function actionBlockedReason(
  role: AdminRole | undefined,
  allowed: readonly AdminAction[],
  action: AdminAction,
): string | null {
  if (allowed.includes(action)) return null;
  return role === 'Viewer' ? 'Viewer admins can’t do this' : 'Only Owners can do this';
}
