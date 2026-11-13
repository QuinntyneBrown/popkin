import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MemberView, PopkinHomeView } from '../../models/home';
import { CreatePopkinRequest, InviteView, PopkinCreatedView } from '../../models/popkin';

/** Popkins (docs/detailed-designs/popkins). */
export interface PopkinsApi {
  createPopkin(request: CreatePopkinRequest): Observable<PopkinCreatedView>;
  getInvite(popkinId: string): Observable<InviteView>;
  /** The header of the Popkin's home. 404 `popkin_not_found` for someone who is not a member. */
  getHome(popkinId: string): Observable<PopkinHomeView>;
  /** The members, the Host first. */
  getMembers(popkinId: string): Observable<MemberView[]>;
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

  getHome(popkinId: string): Observable<PopkinHomeView> {
    return this.http.get<PopkinHomeView>(`/api/popkins/${encodeURIComponent(popkinId)}`);
  }

  getMembers(popkinId: string): Observable<MemberView[]> {
    return this.http.get<MemberView[]>(`/api/popkins/${encodeURIComponent(popkinId)}/members`);
  }
}
