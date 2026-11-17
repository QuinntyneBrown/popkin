import { inject } from '@angular/core';
import { AdminSessionStore, signedOutGuardOf } from 'api';

/** Sign-in is for those signed out: an admin with a session is sent into the console. */
export const signedOutAdminGuard = signedOutGuardOf(() => inject(AdminSessionStore).load(), '/');
