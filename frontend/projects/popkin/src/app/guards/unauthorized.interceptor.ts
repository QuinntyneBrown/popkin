import { inject } from '@angular/core';
import { SessionTeardown, unauthorizedInterceptorOf } from 'api';

/**
 * A 401 from any request but the session check and the code requests means the session ended:
 * the live connection closes, the session is forgotten and the sign-in screen opens, with this
 * screen to come back to (L2-007 AC2, L2-054). Signing out answers 401 when the session had
 * already ended: the dialog signs out all the same.
 */
export const unauthorizedInterceptor = unauthorizedInterceptorOf({
  exempt: (url) =>
    url === '/api/auth/session' ||
    url === '/api/auth/sign-out' ||
    url.startsWith('/api/auth/codes'),
  session: () => inject(SessionTeardown),
});
