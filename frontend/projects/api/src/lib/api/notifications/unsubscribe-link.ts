import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { NOTIFICATIONS_API } from './notifications-api';

/** Where the unsubscribe page is: waiting, done, a refused link, or a request that failed. */
export type UnsubscribeOutcome = 'working' | 'unsubscribed' | 'expired' | 'failed';

/**
 * "Unsubscribe from all email" (L2-168 AC3, AC5): the page posts the link's token once it runs,
 * never on a link scanner's GET. A 410 is an expired link, whatever made it fail; any other
 * failure changed nothing and can be tried again.
 */
@Injectable()
export class UnsubscribeLink {
  private readonly api = inject(NOTIFICATIONS_API);
  private token: string | null = null;
  readonly outcome = signal<UnsubscribeOutcome>('working');

  use(token: string | null): void {
    this.token = token;
    this.post();
  }

  retry(): void {
    this.post();
  }

  private post(): void {
    const token = this.token;
    if (!token) {
      this.outcome.set('expired');
      return;
    }

    this.outcome.set('working');
    this.api.unsubscribe(token).subscribe({
      next: () => this.outcome.set('unsubscribed'),
      error: (error: unknown) =>
        this.outcome.set(
          error instanceof HttpErrorResponse && error.status === 410 ? 'expired' : 'failed',
        ),
    });
  }
}
