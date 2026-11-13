import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { InviteMembersView, InvitePreviewView, JoinedView } from '../../models/invite';

/** Invites, reached through a Popkin's invite code (docs/detailed-designs/invitations). */
export interface InvitesApi {
  /** Open without a session. 404 `invite_not_found`; 429 `rate_limited`. */
  getPreview(code: string): Observable<InvitePreviewView>;
  getMembers(code: string): Observable<InviteMembersView>;
  /** Joins under a display name and, when given, a photo. */
  join(code: string, displayName: string, photo: File | null): Observable<JoinedView>;
}

export const INVITES_API = new InjectionToken<InvitesApi>('InvitesApi');

@Injectable()
export class HttpInvitesApi implements InvitesApi {
  private readonly http = inject(HttpClient);

  getPreview(code: string): Observable<InvitePreviewView> {
    return this.http.get<InvitePreviewView>(`/api/invites/${encodeURIComponent(code)}`);
  }

  getMembers(code: string): Observable<InviteMembersView> {
    return this.http.get<InviteMembersView>(`/api/invites/${encodeURIComponent(code)}/members`);
  }

  join(code: string, displayName: string, photo: File | null): Observable<JoinedView> {
    const form = new FormData();
    form.set('displayName', displayName);
    if (photo) form.set('photo', photo);
    return this.http.post<JoinedView>(`/api/invites/${encodeURIComponent(code)}/join`, form);
  }
}
