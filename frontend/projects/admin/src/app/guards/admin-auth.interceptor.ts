import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminSessionStore } from 'api';
import { catchError, throwError } from 'rxjs';

/**
 * A 401 from a console request other than signing in and reading the admin means the admin
 * session has ended, or the admin was removed (L2-078 AC7): the admin is forgotten and the
 * sign-in opens, with this page to come back to.
 */
export const adminAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const session = inject(AdminSessionStore);
  const exempt = request.url.startsWith('/api/admin/auth/') || request.url === '/api/admin/me';
  return next(request).pipe(
    catchError((error: unknown) => {
      if (!exempt && error instanceof HttpErrorResponse && error.status === 401) {
        session.clear();
        const returnUrl = router.currentNavigation()?.finalUrl?.toString() ?? router.url;
        void router.navigate(['/sign-in'], { queryParams: { returnUrl } });
      }
      return throwError(() => error);
    }),
  );
};
