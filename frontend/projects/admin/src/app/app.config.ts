import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
  ADMIN_ACCESS_API,
  ADMIN_AUTH_API,
  ADMIN_PLATFORM_API,
  HttpAdminAccessApi,
  HttpAdminAuthApi,
  HttpAdminPlatformApi,
  fakeAdminNotificationsBackend,
} from 'api';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { adminAuthInterceptor } from './guards/admin-auth.interceptor';

/** Composition root of the admin app: every API contract is bound to its implementation here. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        adminAuthInterceptor,
        // Notifications have no API yet; the fake answers them in the browser (ADR 0030).
        ...(environment.fakeNotificationsBackend ? [fakeAdminNotificationsBackend()] : []),
      ]),
    ),
    { provide: ADMIN_AUTH_API, useClass: HttpAdminAuthApi },
    { provide: ADMIN_ACCESS_API, useClass: HttpAdminAccessApi },
    { provide: ADMIN_PLATFORM_API, useClass: HttpAdminPlatformApi },
  ],
};
