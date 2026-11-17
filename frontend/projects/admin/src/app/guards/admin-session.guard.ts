import { inject } from '@angular/core';
import { AdminSessionStore, signedInGuardOf } from 'api';

/**
 * Every console page reads the signed-in admin first, so a changed role shows on the next page
 * (L2-086 AC5); without an admin session the sign-in opens, with this page to come back to
 * (L2-088 AC4).
 */
export const adminSessionGuard = signedInGuardOf(() => inject(AdminSessionStore).load());
