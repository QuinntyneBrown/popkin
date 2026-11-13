import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withNavigationErrorHandler,
} from '@angular/router';
import {
  ACCOUNT_API,
  AUTH_API,
  HttpAccountApi,
  LocalStorageThemePreferences,
  THEME_PREFERENCES,
  BrowserQrScanner,
  LocalPopkinsSnapshot,
  PEER_LINKS,
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
  HttpRecapApi,
  INVITES_API,
  LocalOutboxStorage,
  NETWORK_STATUS,
  OUTBOX_STORAGE,
  POPKINS_API,
  RECAP_API,
  POPKIN_REALTIME,
  SignalRPopkinRealtime,
  BrowserCallMedia,
  BrowserSpeakingMeter,
  CALLS_API,
  CALL_MEDIA,
  HttpCallsApi,
  SPEAKING_METER,
  WebRtcPeerLinks,
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
    { provide: ACCOUNT_API, useClass: HttpAccountApi },
    { provide: THEME_PREFERENCES, useClass: LocalStorageThemePreferences },
    // The theme chosen on this device is drawn before the first screen (L2-048 AC4).
    provideAppInitializer(() => inject(THEME_PREFERENCES).apply()),
    { provide: POPKINS_API, useClass: HttpPopkinsApi },
    { provide: INVITES_API, useClass: HttpInvitesApi },
    { provide: CHAT_API, useClass: HttpChatApi },
    { provide: PHOTOS_API, useClass: HttpPhotosApi },
    { provide: EXPERIENCES_API, useClass: HttpExperiencesApi },
    { provide: RECAP_API, useClass: HttpRecapApi },
    { provide: POPKIN_REALTIME, useClass: SignalRPopkinRealtime },
    { provide: NETWORK_STATUS, useClass: BrowserNetworkStatus },
    { provide: OUTBOX_STORAGE, useClass: LocalOutboxStorage },
    { provide: POPKINS_SNAPSHOT, useClass: LocalPopkinsSnapshot },
    { provide: QR_SCANNER, useClass: BrowserQrScanner },
    { provide: CALLS_API, useClass: HttpCallsApi },
    { provide: CALL_MEDIA, useClass: BrowserCallMedia },
    { provide: PEER_LINKS, useClass: WebRtcPeerLinks },
    { provide: SPEAKING_METER, useClass: BrowserSpeakingMeter },
  ],
};
