import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { AuditEntry, AuditQuery } from '../../../models/admin';
import { ADMIN_ACCESS_API } from './admin-access-api';
import { showingText } from './audit-text';

/** How long after the last key the search is applied. */
export const AUDIT_SEARCH_AFTER_MS = 300;

/** An admin the log can be filtered by. */
export interface AuditAdmin {
  id: string;
  name: string;
}

/**
 * The audit log page (docs/detailed-designs/admin-access/audit-log): the newest actions, the
 * search and the admin filter, older pages and the export. One per page.
 */
@Injectable()
export class AuditLogStore {
  private readonly api = inject(ADMIN_ACCESS_API);
  private searchTimer?: ReturnType<typeof setTimeout>;
  /** The filters of the page shown, which the export follows. */
  private readonly applied = signal({ search: '', adminId: '' });

  readonly status = signal<'loading' | 'ready' | 'no-results' | 'failed'>('loading');
  readonly entries = signal<AuditEntry[]>([]);
  readonly total = signal(0);
  readonly next = signal<string | null>(null);
  /** What is typed in the search, applied 300 ms after typing stops. */
  readonly search = signal('');
  readonly adminId = signal('');
  readonly admins = signal<AuditAdmin[]>([]);
  readonly loadingOlder = signal(false);

  readonly filtered = computed(() => !!this.search().trim() || !!this.adminId());

  readonly showing = computed(() => {
    const admin = this.admins().find((a) => a.id === this.adminId());
    return showingText(this.entries().length, this.total(), admin?.name);
  });

  /** The CSV of what the filters match (L2-120 AC4). */
  readonly exportUrl = computed(() => {
    const params = new URLSearchParams();
    const { search, adminId } = this.applied();
    if (search) params.set('search', search);
    if (adminId) params.set('adminId', adminId);
    const query = params.toString().replace(/\+/g, '%20');
    return `/api/admin/audit/export${query ? `?${query}` : ''}`;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  load(): void {
    this.api.admins().subscribe({
      next: (list) => this.admins.set(list.admins.map(({ id, name }) => ({ id, name }))),
      error: () => this.admins.set([]),
    });
    this.read();
  }

  setSearch(value: string): void {
    this.search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.read(), AUDIT_SEARCH_AFTER_MS);
  }

  setAdmin(adminId: string): void {
    this.adminId.set(adminId);
    this.read();
  }

  clearFilters(): void {
    clearTimeout(this.searchTimer);
    this.search.set('');
    this.adminId.set('');
    this.read();
  }

  retry(): void {
    this.read();
  }

  /** The next page, after the last entry shown (L2-120 AC3). */
  loadOlder(): void {
    const before = this.next();
    if (!before || this.loadingOlder()) return;
    this.loadingOlder.set(true);
    this.api.audit({ ...this.query(), before }).subscribe({
      next: (page) => {
        this.entries.update((shown) => [...shown, ...page.entries]);
        this.total.set(page.total);
        this.next.set(page.next);
        this.loadingOlder.set(false);
      },
      error: () => this.loadingOlder.set(false),
    });
  }

  private query(): AuditQuery {
    const query: AuditQuery = {};
    const search = this.search().trim();
    if (search) query.search = search;
    if (this.adminId()) query.adminId = this.adminId();
    return query;
  }

  private read(): void {
    const query = this.query();
    this.applied.set({ search: query.search ?? '', adminId: query.adminId ?? '' });
    this.status.set('loading');
    this.api.audit(query).subscribe({
      next: (page) => {
        this.entries.set(page.entries);
        this.total.set(page.total);
        this.next.set(page.next);
        this.status.set(page.entries.length ? 'ready' : 'no-results');
      },
      error: () => this.status.set('failed'),
    });
  }
}
