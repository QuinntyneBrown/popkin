import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { ADMIN_ACCESS_API, ADMIN_AUTH_API, HttpAdminAccessApi, HttpAdminAuthApi } from 'api';
import { routes } from './app.routes';
import { adminAuthInterceptor } from './guards/admin-auth.interceptor';

/** Composition root of the admin app: every API contract is bound to its implementation here. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([adminAuthInterceptor])),
    { provide: ADMIN_AUTH_API, useClass: HttpAdminAuthApi },
    { provide: ADMIN_ACCESS_API, useClass: HttpAdminAccessApi },
  ],
};
