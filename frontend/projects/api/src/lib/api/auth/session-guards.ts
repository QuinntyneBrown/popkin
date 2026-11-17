import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/** Reads the session, waiting for it; something when signed in, nothing when not. */
export type LoadSession = () => Promise<unknown>;

/**
 * A screen that needs a session (L2-007 AC2, AC3; admin L2-088 AC4): without one the sign-in
 * opens, with the screen asked for to come back to. `load` runs in the guard's injection context.
 */
export function signedInGuardOf(load: LoadSession): CanActivateFn {
  return async (_route, state) => {
    const router = inject(Router);
    return (await load())
      ? true
      : router.createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
  };
}

/** A screen for those signed out (L2-002 AC3): a person with a session is sent `home`. */
export function signedOutGuardOf(load: LoadSession, home: string): CanActivateFn {
  return async () => {
    const router = inject(Router);
    return (await load()) ? router.createUrlTree([home]) : true;
  };
}

export interface UnauthorizedOptions {
  /** Requests whose 401 their own screen handles: signing in, reading the session. */
  exempt: (url: string) => boolean;
  /** What ends the session on this device; resolved in the interceptor's injection context. */
  session: () => { forget(): void };
}

/**
 * A 401 from any request but the exempt ones means the session ended (L2-007 AC2, L2-078 AC7):
 * the session is ended on this device and the sign-in opens, with this screen to come back to.
 */
export function unauthorizedInterceptorOf(options: UnauthorizedOptions): HttpInterceptorFn {
  return (request, next) => {
    const router = inject(Router);
    const session = options.session();
    const exempt = options.exempt(request.url);
    return next(request).pipe(
      catchError((error: unknown) => {
        if (!exempt && error instanceof HttpErrorResponse && error.status === 401) {
          session.forget();
          const returnUrl = router.currentNavigation()?.finalUrl?.toString() ?? router.url;
          void router.navigate(['/sign-in'], { queryParams: { returnUrl } });
        }
        return throwError(() => error);
      }),
    );
  };
}
