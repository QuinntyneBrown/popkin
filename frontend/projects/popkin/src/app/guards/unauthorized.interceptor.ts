import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionTeardown } from 'api';
import { catchError, throwError } from 'rxjs';

/**
 * A 401 from any request but the session check and the code requests means the session ended:
 * the live connection closes, the session is forgotten and the sign-in screen opens, with this
 * screen to come back to (L2-007 AC2).
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const teardown = inject(SessionTeardown);
  // Signing out answers 401 when the session had already ended: the dialog signs out all the same.
  const exempt =
    request.url === '/api/auth/session' ||
    request.url === '/api/auth/sign-out' ||
    request.url.startsWith('/api/auth/codes');
  return next(request).pipe(
    catchError((error: unknown) => {
      if (!exempt && error instanceof HttpErrorResponse && error.status === 401) {
        // The live connection closes and nothing of the person stays on the device (L2-054).
        teardown.forget();
        const returnUrl = router.currentNavigation()?.finalUrl?.toString() ?? router.url;
        void router.navigate(['/sign-in'], { queryParams: { returnUrl } });
      }
      return throwError(() => error);
    }),
  );
};
