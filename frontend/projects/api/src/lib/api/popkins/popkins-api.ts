import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreatePopkinRequest, InviteView, PopkinCreatedView } from '../../models/popkin';

/** Popkins (docs/detailed-designs/popkins). */
export interface PopkinsApi {
  createPopkin(request: CreatePopkinRequest): Observable<PopkinCreatedView>;
  getInvite(popkinId: string): Observable<InviteView>;
}

export const POPKINS_API = new InjectionToken<PopkinsApi>('PopkinsApi');

@Injectable()
export class HttpPopkinsApi implements PopkinsApi {
  private readonly http = inject(HttpClient);

  createPopkin(request: CreatePopkinRequest): Observable<PopkinCreatedView> {
    return this.http.post<PopkinCreatedView>('/api/popkins', request);
  }

  getInvite(popkinId: string): Observable<InviteView> {
    return this.http.get<InviteView>(`/api/popkins/${encodeURIComponent(popkinId)}/invite`);
  }
}
