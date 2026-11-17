import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { Observable, map, mergeMap, of, throwError, timer } from 'rxjs';
import { AdminMe } from '../../../../models/admin';
import { FakeNotificationsBackend, FakeRequest } from './fake-notifications-backend';

/** How long the fake takes to answer, so a dialog's busy state shows as it would. */
export const FAKE_LATENCY_MS = 400;

/**
 * The admin app's notification endpoints before the API has them (ADR 0030): answers
 * `/api/admin/notifications/**` from a `FakeNotificationsBackend`, and adds the notification
 * actions to `GET /api/admin/me`. Every other request goes on to the API. The admin app adds it
 * only while `environment.fakeNotificationsBackend` is set; e2e builds leave it out.
 */
export function fakeAdminNotificationsBackend(
  backend = new FakeNotificationsBackend(),
  latencyMs = FAKE_LATENCY_MS,
): HttpInterceptorFn {
  let admin: FakeRequest['admin'] = null;
  return (request, next): Observable<HttpEvent<unknown>> => {
    const url = new URL(request.url, 'http://popkin.local');
    if (request.method === 'GET' && url.pathname === '/api/admin/me') {
      return next(request).pipe(
        map((event) => {
          if (!(event instanceof HttpResponse) || !event.body) return event;
          const me = event.body as AdminMe;
          admin = { name: me.name, role: me.role };
          return event.clone({ body: { ...me, allowed: backend.allowedFor(me) } });
        }),
      );
    }
    const answer = backend.handle({
      method: request.method,
      path: url.pathname,
      body: request.body,
      admin,
    });
    if (!answer) return next(request);
    return timer(latencyMs).pipe(
      mergeMap(() =>
        answer.status < 400
          ? of(new HttpResponse({ status: answer.status, body: answer.body, url: request.url }))
          : throwError(
              () =>
                new HttpErrorResponse({
                  status: answer.status,
                  error: answer.body,
                  url: request.url,
                }),
            ),
      ),
    );
  };
}
