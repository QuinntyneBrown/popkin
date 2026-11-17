import { inject } from '@angular/core';
import { SessionStore, signedInGuardOf } from 'api';

/**
 * Every screen except the public ones needs a session. Without one the sign-in screen opens,
 * with the screen asked for to come back to (L2-007 AC2, AC3).
 */
export const signedInGuard = signedInGuardOf(() => inject(SessionStore).ensureLoaded());
