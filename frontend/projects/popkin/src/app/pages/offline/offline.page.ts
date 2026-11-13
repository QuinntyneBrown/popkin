import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NETWORK_STATUS, ServerErrorState, safeReturnUrl } from 'api';
import { Button, EmptyState, Icon, Logo, Screen, TopBar } from 'components';

/**
 * The offline screen (L2-056 AC4): a screen that was never loaded needs a connection the first
 * time it opens. Try again opens it once the connection is back.
 */
@Component({
  selector: 'pk-offline-page',
  imports: [Button, EmptyState, Icon, Logo, RouterLink, Screen, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './offline.page.html',
})
export class OfflinePage {
  private readonly router = inject(Router);
  private readonly network = inject(NETWORK_STATUS);
  private readonly message = viewChild.required(EmptyState);

  private readonly state = (this.router.currentNavigation()?.extras.state ??
    history.state ??
    {}) as ServerErrorState;
  private readonly retryUrl = safeReturnUrl(this.state.retryUrl) ?? '/popkins';

  /** Still offline, the screen stays and the heading takes the focus, so it is read again. */
  protected tryAgain(): void {
    if (this.network.online()) void this.router.navigateByUrl(this.retryUrl);
    else this.message().focusHeading();
  }
}
