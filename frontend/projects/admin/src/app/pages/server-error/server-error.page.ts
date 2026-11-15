import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ServerErrorState, safeReturnUrl } from 'api';
import { AdminEntry, Button, EmptyState } from 'components';

/**
 * Something went wrong on Popkin's side (L2-089 AC6): nothing was changed, the reference, and
 * "Try again" for the page that failed. Opened on its own it tries the dashboard.
 */
@Component({
  selector: 'pk-server-error-page',
  imports: [AdminEntry, Button, EmptyState, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-error.page.html',
})
export class ServerErrorPage {
  private readonly state = (inject(Router).currentNavigation()?.extras.state ??
    history.state ??
    {}) as ServerErrorState;

  protected readonly code = this.state.reference
    ? `Error 500 · ref ${this.state.reference}`
    : 'Error 500';
  protected readonly retryUrl = safeReturnUrl(this.state.retryUrl) ?? '/';
}
