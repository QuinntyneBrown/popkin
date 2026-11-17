import { ChangeDetectionStrategy, Component, OnInit, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UnsubscribeLink } from 'api';
import { Button, EmptyState, Logo, Screen, Skeleton, TopBar } from 'components';

/**
 * "Unsubscribe from all email" (L2-168 AC3, AC5): no session needed. Opening the page changes
 * nothing; it posts the link's token once it runs.
 */
@Component({
  selector: 'pk-unsubscribe-page',
  imports: [Button, EmptyState, Logo, RouterLink, Screen, Skeleton, TopBar],
  providers: [UnsubscribeLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './unsubscribe.page.html',
})
export class UnsubscribePage implements OnInit {
  protected readonly link = inject(UnsubscribeLink);
  /** The link's token, from `?t=`. */
  readonly t = input<string>();

  ngOnInit(): void {
    this.link.use(this.t() ?? null);
  }
}
