import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CodeSentView, ConfirmCodeView, RequestCodeRequest, SessionView } from '../../models/auth';

/** Accounts without passwords (docs/detailed-designs/accounts). */
export interface AuthApi {
  requestCode(request: RequestCodeRequest): Observable<CodeSentView>;
  confirmCode(verificationId: string, code: string, name?: string): Observable<ConfirmCodeView>;
  resendCode(verificationId: string): Observable<CodeSentView>;
  /** 401 when there is no live session. */
  getSession(): Observable<SessionView>;
}

export const AUTH_API = new InjectionToken<AuthApi>('AuthApi');

@Injectable()
export class HttpAuthApi implements AuthApi {
  private readonly http = inject(HttpClient);

  requestCode(request: RequestCodeRequest): Observable<CodeSentView> {
    return this.http.post<CodeSentView>('/api/auth/codes', request);
  }

  confirmCode(verificationId: string, code: string, name?: string): Observable<ConfirmCodeView> {
    return this.http.post<ConfirmCodeView>(`/api/auth/codes/${verificationId}/confirm`, {
      code,
      name: name ?? null,
    });
  }

  resendCode(verificationId: string): Observable<CodeSentView> {
    return this.http.post<CodeSentView>(`/api/auth/codes/${verificationId}/resend`, null);
  }

  getSession(): Observable<SessionView> {
    return this.http.get<SessionView>('/api/auth/session');
  }
}
