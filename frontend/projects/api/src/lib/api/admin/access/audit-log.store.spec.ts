import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditEntry, AuditPage } from '../../../models/admin';
import { ADMIN_ACCESS_API, AdminAccessApi } from './admin-access-api';
import { AuditLogStore } from './audit-log.store';

function entry(id: number): AuditEntry {
  return {
    id,
    at: '2026-07-14T09:00:00Z',
    adminId: 'a1',
    adminName: 'Lena Fischer',
    action: 'AddedAdmin',
    actionLabel: 'Added admin',
    targetKind: 'Admin',
    targetId: 't',
    targetName: 'Aiko Tanaka',
    reason: null,
    details: '{}',
  };
}

const page = (ids: number[], total: number, next: string | null = null): AuditPage => ({
  entries: ids.map(entry),
  total,
  next,
});

describe('AuditLogStore', () => {
  let api: { [K in keyof AdminAccessApi]: ReturnType<typeof vi.fn> };
  let store: AuditLogStore;

  beforeEach(() => {
    vi.useFakeTimers();
    api = {
      audit: vi.fn(() => of(page([4, 3], 4, '3'))),
      exportAudit: vi.fn(),
      admins: vi.fn(() => of({ count: 1, admins: [{ id: 'a1', name: 'Lena Fischer' }] })),
      addAdmin: vi.fn(),
      changeRole: vi.fn(),
      removeAdmin: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [AuditLogStore, { provide: ADMIN_ACCESS_API, useValue: api }],
    });
    store = TestBed.inject(AuditLogStore);
    store.load();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('reads the newest page and the admins to filter by', () => {
    expect(api.audit).toHaveBeenCalledWith({});
    expect(store.status()).toBe('ready');
    expect(store.entries().map((e) => e.id)).toEqual([4, 3]);
    expect(store.showing()).toBe('Showing 2 of 4 actions');
    expect(store.admins()).toEqual([{ id: 'a1', name: 'Lena Fischer' }]);
  });

  it('searches 300 ms after typing stops', () => {
    store.setSearch('ai');
    store.setSearch('aiko');
    vi.advanceTimersByTime(299);
    expect(api.audit).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);

    expect(api.audit).toHaveBeenCalledTimes(2);
    expect(api.audit).toHaveBeenLastCalledWith({ search: 'aiko' });
    expect(store.filtered()).toBe(true);
  });

  it('filters by one admin at once, and names them in the count', () => {
    api.audit.mockReturnValue(of(page([4], 1)));

    store.setAdmin('a1');

    expect(api.audit).toHaveBeenLastCalledWith({ adminId: 'a1' });
    expect(store.showing()).toBe('Showing 1 of 1 action by Lena Fischer');
  });

  it('adds the older page after the last entry shown', () => {
    api.audit.mockReturnValue(of(page([2, 1], 4)));

    store.loadOlder();

    expect(api.audit).toHaveBeenLastCalledWith({ before: '3' });
    expect(store.entries().map((e) => e.id)).toEqual([4, 3, 2, 1]);
    expect(store.next()).toBeNull();
  });

  it('says when nothing matches, and clears the filters', () => {
    api.audit.mockReturnValue(of(page([], 0)));
    store.setAdmin('a1');
    expect(store.status()).toBe('no-results');

    api.audit.mockReturnValue(of(page([4, 3], 4, '3')));
    store.clearFilters();

    expect(api.audit).toHaveBeenLastCalledWith({});
    expect(store.search()).toBe('');
    expect(store.filtered()).toBe(false);
  });

  it('fails, and tries again with the same filters', () => {
    api.audit.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    store.setAdmin('a1');
    expect(store.status()).toBe('failed');

    api.audit.mockReturnValue(of(page([4], 1)));
    store.retry();

    expect(api.audit).toHaveBeenLastCalledWith({ adminId: 'a1' });
    expect(store.status()).toBe('ready');
  });

  it('exports what the filters match', () => {
    expect(store.exportUrl()).toBe('/api/admin/audit/export');
    store.setAdmin('a1');
    store.setSearch('ai ko');
    vi.advanceTimersByTime(300);

    expect(store.exportUrl()).toBe('/api/admin/audit/export?search=ai%20ko&adminId=a1');
  });
});
