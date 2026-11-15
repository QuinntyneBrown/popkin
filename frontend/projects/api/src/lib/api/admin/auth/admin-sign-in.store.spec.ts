import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCodeSent, AdminMe } from '../../../models/admin';
import { ADMIN_AUTH_API, AdminAuthApi } from './admin-auth-api';
import { AdminSessionStore } from './admin-session.store';
import { AdminSignInStore } from './admin-sign-in.store';

const now = new Date('2026-07-14T09:40:00Z');
const sent: AdminCodeSent = {
  verificationId: 'v1',
  sentTo: 'lena@popkin.app',
  expiresAt: '2026-07-14T09:50:00Z',
  resendAvailableAt: '2026-07-14T09:40:30Z',
};
const lena: AdminMe = {
  adminId: 'a1',
  name: 'Lena Fischer',
  email: 'lena@popkin.app',
  role: 'Owner',
  allowed: [],
};

const refused = (status: number, body: Record<string, unknown>) =>
  throwError(() => new HttpErrorResponse({ status, error: body }));

describe('AdminSignInStore', () => {
  let api: { [K in keyof AdminAuthApi]: ReturnType<typeof vi.fn> };
  let store: AdminSignInStore;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    api = {
      requestCode: vi.fn(() => of(sent)),
      confirm: vi.fn(() => of(lena)),
      resend: vi.fn(() => of({ ...sent, resendAvailableAt: '2026-07-14T09:41:30Z' })),
      signOut: vi.fn(),
      me: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [AdminSignInStore, { provide: ADMIN_AUTH_API, useValue: api }],
    });
    store = TestBed.inject(AdminSignInStore);
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('sends nothing for an address that is not whole (L2-088 AC2)', () => {
    store.sendCode('lena@popkin');

    expect(api.requestCode).not.toHaveBeenCalled();
    expect(store.emailProblem()?.summary).toBe('Staff email is missing its ending');
    expect(store.step()).toBe('email');
  });

  it('moves to the code with the address it was sent to', () => {
    store.sendCode(' lena@popkin.app ');

    expect(api.requestCode).toHaveBeenCalledWith('lena@popkin.app');
    expect(store.step()).toBe('code');
    expect(store.sentTo()).toBe('lena@popkin.app');
    expect(store.status()).toBe('idle');
  });

  it('signs in and keeps the admin (L2-088 AC4)', async () => {
    store.sendCode('lena@popkin.app');

    const outcome = await store.confirm('482913');

    expect(outcome).toBe('signed-in');
    expect(api.confirm).toHaveBeenCalledWith('v1', '482913');
    expect(TestBed.inject(AdminSessionStore).me()).toEqual(lena);
  });

  it('counts the tries left after a wrong code (L2-088 AC5)', async () => {
    api.confirm.mockReturnValue(refused(400, { code: 'code_mismatch', attemptsLeft: 2 }));
    store.sendCode('lena@popkin.app');

    expect(await store.confirm('481207')).toBeNull();

    expect(store.codeError()).toBe(
      'That code doesn’t match. 2 tries left before the console locks for 15 minutes.',
    );
    expect(store.status()).toBe('idle');
  });

  it('locks with the time to try again (L2-088 AC6)', async () => {
    api.confirm.mockReturnValue(
      refused(429, { code: 'admin_locked', lockedUntil: '2026-07-14T09:57:00Z' }),
    );
    store.sendCode('lena@popkin.app');

    await store.confirm('000000');

    expect(store.status()).toBe('locked');
    expect(store.lockedText()).toMatch(/^Try again at \d\d:57, or ask an Owner/);
  });

  it('says when the code was right but not an admin’s (L2-078 AC2)', async () => {
    api.confirm.mockReturnValue(refused(403, { code: 'not_an_admin' }));
    store.sendCode('mara@hey.com');

    expect(await store.confirm('482913')).toBe('not-an-admin');
  });

  it('offers a new code once 30 seconds have passed', () => {
    store.sendCode('lena@popkin.app');
    expect(store.canResend()).toBe(false);

    vi.advanceTimersByTime(30_000);
    expect(store.canResend()).toBe(true);
    store.resend();

    expect(api.resend).toHaveBeenCalledWith('v1');
    expect(store.canResend()).toBe(false);
  });

  it('goes back to the email, keeping it (L2-088 AC7)', () => {
    store.sendCode('lena@popkin.app');

    store.useAnotherEmail();

    expect(store.step()).toBe('email');
    expect(store.email()).toBe('lena@popkin.app');
  });
});
