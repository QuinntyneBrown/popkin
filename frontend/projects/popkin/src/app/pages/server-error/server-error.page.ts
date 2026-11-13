import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ServerErrorState, safeReturnUrl } from 'api';
import { Button, EmptyState, Icon, Logo, Screen, TopBar } from 'components';

/**
 * An unexpected server error (L2-056 AC6): it went wrong on Popkin's side, here is the reference,
 * try again. Opened on its own it has no reference and Try again opens My Popkins.
 */
@Component({
  selector: 'pk-server-error-page',
  imports: [Button, EmptyState, Icon, Logo, RouterLink, Screen, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-error.page.html',
})
export class ServerErrorPage {
  private readonly state = (inject(Router).currentNavigation()?.extras.state ??
    history.state ??
    {}) as ServerErrorState;

  protected readonly reference = this.state.reference;
  protected readonly retryUrl = safeReturnUrl(this.state.retryUrl) ?? '/popkins';
}
