import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRow } from '../../../models/admin';
import { ADMIN_ACCESS_API } from './admin-access-api';
import { AdminsStore } from './admins.store';

const row = (id: string, role: AdminRow['role'] = 'Support'): AdminRow => ({
  id,
  name: id,
  email: `${id}@popkin.app`,
  role,
  invited: false,
  lastActiveAt: null,
  isYou: false,
  isLastOwner: false,
});

describe('AdminsStore', () => {
  const admins = vi.fn();
  let store: AdminsStore;

  beforeEach(() => {
    admins.mockReturnValue(of({ count: 2, admins: [row('lena', 'Owner'), row('aiko')] }));
    TestBed.configureTestingModule({
      providers: [AdminsStore, { provide: ADMIN_ACCESS_API, useValue: { admins } }],
    });
    store = TestBed.inject(AdminsStore);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('lists the admins, and fails when they cannot be read', () => {
    store.load();
    expect(store.status()).toBe('ready');
    expect(store.admins().map((a) => a.id)).toEqual(['lena', 'aiko']);

    admins.mockReturnValue(throwError(() => new Error('down')));
    store.load();
    expect(store.status()).toBe('failed');
  });

  it('adds, replaces and removes rows from the dialogs’ answers', () => {
    store.load();

    store.added(row('priya'));
    store.replaced(row('aiko', 'Viewer'));
    store.removed('lena');

    expect(store.admins().map((a) => [a.id, a.role])).toEqual([
      ['aiko', 'Viewer'],
      ['priya', 'Support'],
    ]);
  });
});
