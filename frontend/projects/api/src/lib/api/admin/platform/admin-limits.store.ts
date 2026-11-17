import { Injectable, inject, signal } from '@angular/core';
import { AdminLimits, LimitKeyId } from '../../../models/admin';
import { ADMIN_PLATFORM_API } from './admin-platform-api';
import { LimitsDraft } from './limits-draft';

/** The Limits page (docs/detailed-designs/admin-platform/limits). One per page. */
@Injectable()
export class AdminLimitsStore {
  private readonly api = inject(ADMIN_PLATFORM_API);

  readonly status = signal<'loading' | 'ready' | 'failed'>('loading');
  readonly draft = signal<LimitsDraft | null>(null);

  /** Reads the limits, showing them loading; "Try again" calls it too. */
  load(): void {
    this.status.set('loading');
    this.api.limits().subscribe({
      next: (limits) => {
        this.draft.set(new LimitsDraft(limits));
        this.status.set('ready');
      },
      error: () => this.status.set('failed'),
    });
  }

  edit(limit: LimitKeyId, value: string): void {
    this.draft.update((d) => d?.with(limit, value) ?? d);
  }

  discard(): void {
    this.draft.update((d) => d?.discarded() ?? d);
  }

  /** The limits as saved: the new start, nothing unsaved (L2-117 AC5). */
  saved(limits: AdminLimits): void {
    this.draft.set(new LimitsDraft(limits));
  }
}
