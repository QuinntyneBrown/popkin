import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { AdminWaiting } from '../../../models/admin';
import { ADMIN_PLATFORM_API } from '../platform/admin-platform-api';

/** How often the sidebar's counts are read again (admin shell design). */
export const WAITING_EVERY_MS = 60_000;

/**
 * The counts beside the sidebar's sections, read when the console opens and every minute after
 * (docs/detailed-designs/admin-access/admin-shell). A failed read keeps the last counts.
 */
@Injectable({ providedIn: 'root' })
export class AdminWaitingStore {
  private readonly api = inject(ADMIN_PLATFORM_API);

  readonly waiting = signal<AdminWaiting | null>(null);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Reads now and every minute until stopped. */
  start(): void {
    if (this.timer) return;
    this.read();
    this.timer = setInterval(() => this.read(), WAITING_EVERY_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  read(): void {
    this.api.waiting().subscribe({
      next: (waiting) => this.waiting.set(waiting),
      error: () => undefined,
    });
  }
}
