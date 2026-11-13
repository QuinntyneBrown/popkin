import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from 'api';

/**
 * The landing page is for visitors: a person who is signed in is sent to My Popkins instead
 * (L2-002 AC3).
 */
export const signedOutGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const session = await inject(SessionStore).ensureLoaded();
  return session ? router.createUrlTree(['/popkins']) : true;
};
