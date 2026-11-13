import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { MyPopkinsView } from '../../models/my-popkins';
import { Observable } from 'rxjs';
import { MemberView, PopkinHomeView } from '../../models/home';
import { CreatePopkinRequest, InviteView, PopkinCreatedView } from '../../models/popkin';
import { WrapUpPreviewView, WrapUpResult } from '../../models/recap';

/** Popkins (docs/detailed-designs/popkins). */
export interface PopkinsApi {
  createPopkin(request: CreatePopkinRequest): Observable<PopkinCreatedView>;
  /** The caller's own Popkins, the most recently active first (L2-017, L2-018). */
  listMine(): Observable<MyPopkinsView>;
  getInvite(popkinId: string): Observable<InviteView>;
  /** The header of the Popkin's home. 404 `popkin_not_found` for someone who is not a member. */
  getHome(popkinId: string): Observable<PopkinHomeView>;
  /** The members, the Host first. */
  getMembers(popkinId: string): Observable<MemberView[]>;
  /** What the wrap-up screen says of the recap to come. Host only: 403 `host_only`. */
  getWrapUpPreview(popkinId: string): Observable<WrapUpPreviewView>;
  /** Wraps the Popkin up (L2-043). 403 `host_only`; 409 `popkin_wrapped_up`. */
  wrapUp(popkinId: string, keepPhotos: boolean): Observable<WrapUpResult>;
  /** Sends the new Popkin's invite to every member of a wrapped-up one (L2-046 AC5). */
  inviteCrew(popkinId: string, fromPopkinId: string): Observable<void>;
}

export const POPKINS_API = new InjectionToken<PopkinsApi>('PopkinsApi');

@Injectable()
export class HttpPopkinsApi implements PopkinsApi {
  private readonly http = inject(HttpClient);

  createPopkin(request: CreatePopkinRequest): Observable<PopkinCreatedView> {
    return this.http.post<PopkinCreatedView>('/api/popkins', request);
  }

  listMine(): Observable<MyPopkinsView> {
    return this.http.get<MyPopkinsView>('/api/popkins');
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

  getWrapUpPreview(popkinId: string): Observable<WrapUpPreviewView> {
    return this.http.get<WrapUpPreviewView>(`/api/popkins/${encodeURIComponent(popkinId)}/wrap-up`);
  }

  wrapUp(popkinId: string, keepPhotos: boolean): Observable<WrapUpResult> {
    return this.http.post<WrapUpResult>(`/api/popkins/${encodeURIComponent(popkinId)}/wrap-up`, {
      keepPhotos,
    });
  }

  inviteCrew(popkinId: string, fromPopkinId: string): Observable<void> {
    return this.http.post<void>(`/api/popkins/${encodeURIComponent(popkinId)}/crew-invites`, {
      fromPopkinId,
    });
  }
}
