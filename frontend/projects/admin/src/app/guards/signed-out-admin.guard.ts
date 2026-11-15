import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminSessionStore } from 'api';

/** Sign-in is for those signed out: an admin with a session is sent into the console. */
export const signedOutAdminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const me = await inject(AdminSessionStore).load();
  return me ? router.createUrlTree(['/']) : true;
};
