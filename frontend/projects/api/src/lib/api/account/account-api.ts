import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AccountView, DeletionImpactView } from '../../models/account';

/** The signed-in person's own account (docs/detailed-designs/accounts/manage-account). */
export interface AccountApi {
  getAccount(): Observable<AccountView>;
  /** 400 `name_invalid` unless it is 1 to 40 characters. */
  updateName(name: string): Observable<AccountView>;
  /** 400 `photo_type_not_allowed` or `photo_too_large` when the photo is refused. */
  changePhoto(photo: File): Observable<AccountView>;
  /** The active Popkins that wrap up when the account is deleted (L2-049 AC3). */
  getDeletionImpact(): Observable<DeletionImpactView>;
  /** Deletes the account and ends its session (L2-049 AC4). */
  deleteAccount(): Observable<void>;
}

export const ACCOUNT_API = new InjectionToken<AccountApi>('AccountApi');

@Injectable()
export class HttpAccountApi implements AccountApi {
  private readonly http = inject(HttpClient);

  getAccount(): Observable<AccountView> {
    return this.http.get<AccountView>('/api/account');
  }

  updateName(name: string): Observable<AccountView> {
    return this.http.patch<AccountView>('/api/account', { name });
  }

  changePhoto(photo: File): Observable<AccountView> {
    const form = new FormData();
    form.set('photo', photo);
    return this.http.put<AccountView>('/api/account/photo', form);
  }

  getDeletionImpact(): Observable<DeletionImpactView> {
    return this.http.get<DeletionImpactView>('/api/account/deletion-impact');
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>('/api/account');
  }
}
