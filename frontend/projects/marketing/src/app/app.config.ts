import {
  ApplicationConfig,
  InjectionToken,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { environment } from '../environments/environment';

/** The app's address; every link to the app is built from it (L2-081 AC2). */
export const APP_URL = new InjectionToken<string>('APP_URL');

/**
 * Composition root. The site has no router, no session and no HTTP client: it calls no API
 * (L2-081 AC4, ADR 0017).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: APP_URL, useValue: environment.appUrl },
  ],
};
