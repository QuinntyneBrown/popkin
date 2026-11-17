import { inject } from '@angular/core';
import { AdminSessionStore, unauthorizedInterceptorOf } from 'api';

/**
 * A 401 from a console request other than signing in and reading the admin means the admin
 * session has ended, or the admin was removed (L2-078 AC7): the admin is forgotten and the
 * sign-in opens, with this page to come back to.
 */
export const adminAuthInterceptor = unauthorizedInterceptorOf({
  exempt: (url) => url.startsWith('/api/admin/auth/') || url === '/api/admin/me',
  session: () => {
    const session = inject(AdminSessionStore);
    return { forget: () => session.clear() };
  },
});
