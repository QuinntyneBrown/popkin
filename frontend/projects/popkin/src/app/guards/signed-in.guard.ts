import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from 'api';

/**
 * Every screen except the public ones needs a session. Without one the sign-in screen opens,
 * with the screen asked for to come back to (L2-007 AC2, AC3).
 */
export const signedInGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const session = await inject(SessionStore).ensureLoaded();
  return session
    ? true
    : router.createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
};
