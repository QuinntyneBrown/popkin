import { inject } from '@angular/core';
import { SessionStore, signedOutGuardOf } from 'api';

/**
 * The landing page is for visitors: a person who is signed in is sent to My Popkins instead
 * (L2-002 AC3).
 */
export const signedOutGuard = signedOutGuardOf(
  () => inject(SessionStore).ensureLoaded(),
  '/popkins',
);
