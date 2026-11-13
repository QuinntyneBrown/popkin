import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

/** What the server-error screen shows: the failure's reference and the screen to try again. */
export interface ServerErrorState {
  reference?: string;
  retryUrl?: string;
}

/**
 * Opens the not-found and server-error screens in place of a screen whose primary read failed.
 * The address bar keeps the failed screen's URL, so a reload retries it (L2-056 AC5, AC6).
 */
@Injectable({ providedIn: 'root' })
export class ErrorScreens {
  private readonly router = inject(Router);

  showServerError(reference: string | undefined, retryUrl: string): void {
    const state: ServerErrorState = { reference, retryUrl };
    void this.router.navigateByUrl('/error', { skipLocationChange: true, state });
  }

  showNotFound(): void {
    void this.router.navigateByUrl('/not-found', { skipLocationChange: true });
  }
}
