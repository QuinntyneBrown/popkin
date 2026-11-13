import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from 'api';
import { catchError, throwError } from 'rxjs';

/**
 * A 401 from any request but the session check and the code requests means the session ended:
 * the session is forgotten and the sign-in screen opens, with this screen to come back to
 * (L2-007 AC2).
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const sessions = inject(SessionStore);
  const exempt = request.url === '/api/auth/session' || request.url.startsWith('/api/auth/codes');
  return next(request).pipe(
    catchError((error: unknown) => {
      if (!exempt && error instanceof HttpErrorResponse && error.status === 401) {
        sessions.clear();
        const returnUrl = router.currentNavigation()?.finalUrl?.toString() ?? router.url;
        void router.navigate(['/sign-in'], { queryParams: { returnUrl } });
      }
      return throwError(() => error);
    }),
  );
};
