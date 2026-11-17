import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminFeature,
  AdminFeatures,
  AdminNotificationKind,
  AdminNotifications,
  AdminSendStatus,
  FeatureMode,
  FeaturePopkinMatch,
  NotificationKindId,
} from '../../../models/admin';
import { PopkinFeature } from '../../../models/home';

/**
 * Features (docs/detailed-designs/admin-platform/feature-switches) and Notifications
 * (docs/detailed-designs/admin-platform/notifications).
 */
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
  notifications(): Observable<AdminNotifications>;
  /** 403 `role_not_allowed` for Support and Viewer; 409 `email_already_paused`. */
  pauseEmail(reason: string | null): Observable<AdminSendStatus>;
  /** 403 `role_not_allowed` for Support and Viewer; 409 `email_not_paused`. */
  resumeEmail(reason: string | null): Observable<AdminSendStatus>;
  /** 400 `notification_required` for "Sign-in codes and security"; 403 for Support and Viewer. */
  switchKind(
    kind: NotificationKindId,
    on: boolean,
    reason: string | null,
  ): Observable<AdminNotificationKind>;
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

  notifications(): Observable<AdminNotifications> {
    return this.http.get<AdminNotifications>('/api/admin/notifications');
  }

  pauseEmail(reason: string | null): Observable<AdminSendStatus> {
    return this.http.post<AdminSendStatus>('/api/admin/notifications/pause', { reason });
  }

  resumeEmail(reason: string | null): Observable<AdminSendStatus> {
    return this.http.post<AdminSendStatus>('/api/admin/notifications/resume', { reason });
  }

  switchKind(
    kind: NotificationKindId,
    on: boolean,
    reason: string | null,
  ): Observable<AdminNotificationKind> {
    return this.http.put<AdminNotificationKind>(`/api/admin/notifications/kinds/${kind}`, {
      on,
      reason,
    });
  }
}
