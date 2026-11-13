import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { POPKINS_SNAPSHOT, SessionStore } from 'api';
import { catchError, throwError } from 'rxjs';

/**
 * A 401 from any request but the session check and the code requests means the session ended:
 * the session is forgotten and the sign-in screen opens, with this screen to come back to
 * (L2-007 AC2).
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const sessions = inject(SessionStore);
  const snapshot = inject(POPKINS_SNAPSHOT);
  // Signing out answers 401 when the session had already ended: the dialog signs out all the same.
  const exempt =
    request.url === '/api/auth/session' ||
    request.url === '/api/auth/sign-out' ||
    request.url.startsWith('/api/auth/codes');
  return next(request).pipe(
    catchError((error: unknown) => {
      if (!exempt && error instanceof HttpErrorResponse && error.status === 401) {
        sessions.clear();
        // Nothing of the person's stays on a device they are signed out of (L2-054).
        snapshot.clear();
        const returnUrl = router.currentNavigation()?.finalUrl?.toString() ?? router.url;
        void router.navigate(['/sign-in'], { queryParams: { returnUrl } });
      }
      return throwError(() => error);
    }),
  );
};
