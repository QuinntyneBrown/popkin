import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CodeSentView, RequestCodeRequest } from '../../models/auth';

/** Accounts without passwords (docs/detailed-designs/accounts). */
export interface AuthApi {
  requestCode(request: RequestCodeRequest): Observable<CodeSentView>;
}

export const AUTH_API = new InjectionToken<AuthApi>('AuthApi');

@Injectable()
export class HttpAuthApi implements AuthApi {
  private readonly http = inject(HttpClient);

  requestCode(request: RequestCodeRequest): Observable<CodeSentView> {
    return this.http.post<CodeSentView>('/api/auth/codes', request);
  }
}
