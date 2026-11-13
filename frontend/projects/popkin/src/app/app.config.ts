import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withNavigationErrorHandler,
} from '@angular/router';
import {
  AUTH_API,
  BrowserQrScanner,
  LocalPopkinsSnapshot,
  POPKINS_SNAPSHOT,
  QR_SCANNER,
  BrowserNetworkStatus,
  CHAT_API,
  EXPERIENCES_API,
  HttpExperiencesApi,
  HttpPhotosApi,
  PHOTOS_API,
  HttpAuthApi,
  HttpChatApi,
  HttpInvitesApi,
  HttpPopkinsApi,
  INVITES_API,
  LocalOutboxStorage,
  NETWORK_STATUS,
  OUTBOX_STORAGE,
  POPKINS_API,
  POPKIN_REALTIME,
  SignalRPopkinRealtime,
} from 'api';
import { routes } from './app.routes';
import { offlineNavigation } from './guards/offline-navigation';
import { unauthorizedInterceptor } from './guards/unauthorized.interceptor';

/** Composition root: every API contract is bound to its implementation here. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([unauthorizedInterceptor])),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withNavigationErrorHandler(offlineNavigation),
    ),
    { provide: AUTH_API, useClass: HttpAuthApi },
    { provide: POPKINS_API, useClass: HttpPopkinsApi },
    { provide: INVITES_API, useClass: HttpInvitesApi },
    { provide: CHAT_API, useClass: HttpChatApi },
    { provide: PHOTOS_API, useClass: HttpPhotosApi },
    { provide: EXPERIENCES_API, useClass: HttpExperiencesApi },
    { provide: POPKIN_REALTIME, useClass: SignalRPopkinRealtime },
    { provide: NETWORK_STATUS, useClass: BrowserNetworkStatus },
    { provide: OUTBOX_STORAGE, useClass: LocalOutboxStorage },
    { provide: POPKINS_SNAPSHOT, useClass: LocalPopkinsSnapshot },
    { provide: QR_SCANNER, useClass: BrowserQrScanner },
  ],
};
