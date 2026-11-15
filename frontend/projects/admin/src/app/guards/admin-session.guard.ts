import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminSessionStore } from 'api';

/**
 * Every console page reads the signed-in admin first, so a changed role shows on the next page
 * (L2-086 AC5); without an admin session the sign-in opens, with this page to come back to
 * (L2-088 AC4).
 */
export const adminSessionGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const me = await inject(AdminSessionStore).load();
  return me ? true : router.createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
};
