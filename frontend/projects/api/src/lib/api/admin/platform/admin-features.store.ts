import { Injectable, inject, signal } from '@angular/core';
import { AdminFeature } from '../../../models/admin';
import { ADMIN_PLATFORM_API } from './admin-platform-api';

/** The Features page (docs/detailed-designs/admin-platform/feature-switches). One per page. */
@Injectable()
export class AdminFeaturesStore {
  private readonly api = inject(ADMIN_PLATFORM_API);

  readonly status = signal<'loading' | 'ready' | 'failed'>('loading');
  readonly features = signal<AdminFeature[]>([]);

  load(): void {
    this.status.set('loading');
    this.api.features().subscribe({
      next: (page) => {
        this.features.set(page.features);
        this.status.set('ready');
      },
      error: () => this.status.set('failed'),
    });
  }

  /** A feature as the API saved it, in its panel's place (L2-076 AC7). */
  saved(feature: AdminFeature): void {
    this.features.update((list) => list.map((f) => (f.feature === feature.feature ? feature : f)));
  }
}
