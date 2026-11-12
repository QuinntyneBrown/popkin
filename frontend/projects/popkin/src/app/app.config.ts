import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { AUTH_API, HttpAuthApi, HttpPopkinsApi, POPKINS_API } from 'api';
import { routes } from './app.routes';

/** Composition root: every API contract is bound to its implementation here. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: AUTH_API, useClass: HttpAuthApi },
    { provide: POPKINS_API, useClass: HttpPopkinsApi },
  ],
};
