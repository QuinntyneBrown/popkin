import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminFeature,
  AdminFeatures,
  FeatureMode,
  FeaturePopkinMatch,
} from '../../../models/admin';
import { PopkinFeature } from '../../../models/home';

/** Features (docs/detailed-designs/admin-platform/feature-switches). */
export interface AdminPlatformApi {
  features(): Observable<AdminFeatures>;
  /** 403 `role_not_allowed` for Support and Viewer. */
  changeMode(
    feature: PopkinFeature,
    mode: FeatureMode,
    reason: string | null,
  ): Observable<AdminFeature>;
  /** 409 `popkin_wrapped_up` or `feature_popkin_already_chosen`. */
  addPopkin(
    feature: PopkinFeature,
    popkinId: string,
    reason: string | null,
  ): Observable<AdminFeature>;
  removePopkin(feature: PopkinFeature, popkinId: string): Observable<AdminFeature>;
  searchPopkins(feature: PopkinFeature, text: string): Observable<FeaturePopkinMatch[]>;
}

export const ADMIN_PLATFORM_API = new InjectionToken<AdminPlatformApi>('AdminPlatformApi');

@Injectable()
export class HttpAdminPlatformApi implements AdminPlatformApi {
  private readonly http = inject(HttpClient);

  features(): Observable<AdminFeatures> {
    return this.http.get<AdminFeatures>('/api/admin/features');
  }

  changeMode(
    feature: PopkinFeature,
    mode: FeatureMode,
    reason: string | null,
  ): Observable<AdminFeature> {
    return this.http.put<AdminFeature>(`/api/admin/features/${feature}`, { mode, reason });
  }

  addPopkin(
    feature: PopkinFeature,
    popkinId: string,
    reason: string | null,
  ): Observable<AdminFeature> {
    return this.http.post<AdminFeature>(`/api/admin/features/${feature}/popkins`, {
      popkinId,
      reason,
    });
  }

  removePopkin(feature: PopkinFeature, popkinId: string): Observable<AdminFeature> {
    return this.http.delete<AdminFeature>(`/api/admin/features/${feature}/popkins/${popkinId}`);
  }

  searchPopkins(feature: PopkinFeature, text: string): Observable<FeaturePopkinMatch[]> {
    return this.http.get<FeaturePopkinMatch[]>(`/api/admin/features/${feature}/popkins/search`, {
      params: { q: text },
    });
  }
}
