import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminCodeSent, AdminMe } from '../../../models/admin';

/** Signing in to the console with a code (docs/detailed-designs/admin-access/admin-sign-in). */
export interface AdminAuthApi {
  /** 429 `admin_locked` with `lockedUntil` while the email is locked (L2-088 AC6). */
  requestCode(email: string): Observable<AdminCodeSent>;
  /** 400 `code_mismatch` with `attemptsLeft`; 403 `not_an_admin`; 429 `admin_locked`. */
  confirm(verificationId: string, code: string): Observable<AdminMe>;
  resend(verificationId: string): Observable<AdminCodeSent>;
  signOut(): Observable<void>;
  /** 401 without an admin session. */
  me(): Observable<AdminMe>;
}

export const ADMIN_AUTH_API = new InjectionToken<AdminAuthApi>('AdminAuthApi');

@Injectable()
export class HttpAdminAuthApi implements AdminAuthApi {
  private readonly http = inject(HttpClient);

  requestCode(email: string): Observable<AdminCodeSent> {
    return this.http.post<AdminCodeSent>('/api/admin/auth/codes', { email });
  }

  confirm(verificationId: string, code: string): Observable<AdminMe> {
    return this.http.post<AdminMe>(`/api/admin/auth/codes/${verificationId}/confirm`, { code });
  }

  resend(verificationId: string): Observable<AdminCodeSent> {
    return this.http.post<AdminCodeSent>(`/api/admin/auth/codes/${verificationId}/resend`, null);
  }

  signOut(): Observable<void> {
    return this.http.post<void>('/api/admin/auth/sign-out', null);
  }

  me(): Observable<AdminMe> {
    return this.http.get<AdminMe>('/api/admin/me');
  }
}
