import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { AUTH_API, HttpAuthApi, HttpPopkinsApi, POPKINS_API } from 'api';
import { routes } from './app.routes';
import { unauthorizedInterceptor } from './guards/unauthorized.interceptor';

/** Composition root: every API contract is bound to its implementation here. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([unauthorizedInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    { provide: AUTH_API, useClass: HttpAuthApi },
    { provide: POPKINS_API, useClass: HttpPopkinsApi },
  ],
};
