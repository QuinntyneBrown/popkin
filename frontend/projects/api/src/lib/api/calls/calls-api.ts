import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CallMediaState, CallView, JoinedCallView } from '../../models/calls';

/** A Popkin's group call (docs/detailed-designs/calls). */
export interface CallsApi {
  /** The group call under way, or null. 404 `popkin_not_found` for someone who is not a member. */
  getCurrent(popkinId: string): Observable<CallView | null>;
  /**
   * Starts the Popkin's group call, or joins the one under way (L2-029 AC1). 404
   * `popkin_not_found`; 409 `popkin_wrapped_up`.
   */
  join(popkinId: string, media: CallMediaState): Observable<JoinedCallView>;
  /** Leaves the call; it ends when nobody remains (L2-029 AC6). 404 `call_not_found`. */
  leave(popkinId: string, callId: string): Observable<void>;
  /** Tells the others the member's microphone and camera (L2-030 AC5). 404 `call_not_found`. */
  setMedia(popkinId: string, callId: string, media: CallMediaState): Observable<void>;
}

export const CALLS_API = new InjectionToken<CallsApi>('CallsApi');

@Injectable()
export class HttpCallsApi implements CallsApi {
  private readonly http = inject(HttpClient);

  getCurrent(popkinId: string): Observable<CallView | null> {
    return this.http
      .get<CallView | null>(`${calls(popkinId)}/current`)
      .pipe(map((call) => call ?? null));
  }

  join(popkinId: string, media: CallMediaState): Observable<JoinedCallView> {
    return this.http.post<JoinedCallView>(calls(popkinId), media);
  }

  leave(popkinId: string, callId: string): Observable<void> {
    return this.http.post<void>(`${calls(popkinId)}/${callId}/leave`, null);
  }

  setMedia(popkinId: string, callId: string, media: CallMediaState): Observable<void> {
    return this.http.patch<void>(`${calls(popkinId)}/${callId}/participants/me`, media);
  }
}

function calls(popkinId: string): string {
  return `/api/popkins/${popkinId}/calls`;
}
