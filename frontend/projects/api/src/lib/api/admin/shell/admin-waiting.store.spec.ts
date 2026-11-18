import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_PLATFORM_API } from '../platform/admin-platform-api';
import { AdminWaitingStore, WAITING_EVERY_MS } from './admin-waiting.store';

describe('AdminWaitingStore', () => {
  const waiting = vi.fn();
  let store: AdminWaitingStore;

  beforeEach(() => {
    vi.useFakeTimers();
    waiting.mockReturnValue(
      of({ reports: 0, failedJobs: 0, failedExports: 0, holidayCalendars: 2 }),
    );
    TestBed.configureTestingModule({
      providers: [{ provide: ADMIN_PLATFORM_API, useValue: { waiting } }],
    });
    store = TestBed.inject(AdminWaitingStore);
  });

  afterEach(() => {
    store.stop();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('reads the counts at once and every minute after', () => {
    store.start();
    expect(store.waiting()?.holidayCalendars).toBe(2);

    vi.advanceTimersByTime(WAITING_EVERY_MS);
    expect(waiting).toHaveBeenCalledTimes(2);
  });

  it('keeps the last counts when a read fails', () => {
    store.start();
    waiting.mockReturnValue(throwError(() => new Error('down')));
    vi.advanceTimersByTime(WAITING_EVERY_MS);

    expect(store.waiting()?.holidayCalendars).toBe(2);
  });
});
