import { Injectable, inject, signal } from '@angular/core';
import { AdminRolesView, AdminRow } from '../../../models/admin';
import { ADMIN_ACCESS_API } from './admin-access-api';

/** Admins & roles (docs/detailed-designs/admin-access/manage-admins). One per page. */
@Injectable()
export class AdminsStore {
  private readonly api = inject(ADMIN_ACCESS_API);

  readonly status = signal<'loading' | 'ready' | 'failed'>('loading');
  readonly admins = signal<AdminRow[]>([]);
  readonly roles = signal<AdminRolesView | null>(null);

  load(): void {
    this.status.set('loading');
    this.api.admins().subscribe({
      next: (list) => {
        this.admins.set(list.admins);
        this.status.set('ready');
      },
      error: () => this.status.set('failed'),
    });
  }

  loadRoles(): void {
    this.api.roles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.roles.set(null),
    });
  }

  /** An admin a dialog added, listed after the others. */
  added(row: AdminRow): void {
    this.admins.update((rows) => [...rows, row]);
  }

  /** An admin whose role a dialog changed. */
  replaced(row: AdminRow): void {
    this.admins.update((rows) => rows.map((r) => (r.id === row.id ? row : r)));
  }

  removed(adminId: string): void {
    this.admins.update((rows) => rows.filter((r) => r.id !== adminId));
  }
}
