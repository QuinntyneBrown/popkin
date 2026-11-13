import { inject } from '@angular/core';
import { NavigationError, RedirectCommand, Router } from '@angular/router';
import { NETWORK_STATUS, ServerErrorState } from 'api';

/**
 * A screen opened for the first time has to be fetched. Offline that fails, and the offline
 * screen says so, with the screen that was asked for to try again (L2-056 AC4).
 */
export function offlineNavigation(error: NavigationError): RedirectCommand | void {
  if (inject(NETWORK_STATUS).online()) return;
  const state: ServerErrorState = { retryUrl: error.url };
  return new RedirectCommand(inject(Router).parseUrl('/offline'), {
    skipLocationChange: true,
    state,
  });
}
