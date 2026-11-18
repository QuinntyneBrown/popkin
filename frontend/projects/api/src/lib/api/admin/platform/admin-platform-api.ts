import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminFeature,
  AdminFeatures,
  AdminHoliday,
  AdminHolidayCalendar,
  AdminHolidayCalendars,
  AdminLimits,
  AdminNotificationDefaults,
  AdminNotificationHold,
  AdminNotificationHolds,
  AdminNotificationKind,
  AdminNotifications,
  AdminSendStatus,
  FeatureMode,
  FeaturePopkinMatch,
  HoldPopkinMatch,
  LimitChangeRequest,
  NotificationDefaultsChange,
  NotificationKindId,
  AdminWaiting,
  HolidayYearPublished,
} from '../../../models/admin';
import { PopkinFeature } from '../../../models/home';

/**
 * Features (docs/detailed-designs/admin-platform/feature-switches), Notifications
 * (docs/detailed-designs/admin-platform/notifications) and Limits
 * (docs/detailed-designs/admin-platform/limits), Holiday calendars
 * (docs/detailed-designs/admin-platform/holiday-calendars), and the sidebar's counts.
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
  notificationHolds(): Observable<AdminNotificationHolds>;
  /** Active Popkins not already held whose name contains the text or whose code is it. */
  searchHoldPopkins(text: string): Observable<HoldPopkinMatch[]>;
  /** 403 for a Viewer; 409 `popkin_already_held`, `popkin_wrapped_up`. */
  holdPopkin(popkinId: string, reason: string | null): Observable<AdminNotificationHold>;
  /** 403 for a Viewer; 404 `hold_not_found`. */
  releaseHold(holdId: string, reason: string | null): Observable<void>;
  notificationDefaults(): Observable<AdminNotificationDefaults>;
  /** 400 `default_not_allowed`, `no_change`; 403 for Support and Viewer. */
  changeNotificationDefaults(
    defaults: NotificationDefaultsChange,
    reason: string | null,
  ): Observable<AdminNotificationDefaults>;
  limits(): Observable<AdminLimits>;
  /** 400 `limit_not_allowed`, `limit_unknown`, `no_change`, `reason_required`; 403 for Support and Viewer. */
  changeLimits(changes: LimitChangeRequest[], reason: string | null): Observable<AdminLimits>;
  holidayCalendars(): Observable<AdminHolidayCalendars>;
  /** Without a year, the year chosen first; 404 `holiday_calendar_not_found`, 400 `invalid_year`. */
  holidayCalendar(calendarId: string, year?: number): Observable<AdminHolidayCalendar>;
  /** Confirms the date; 409 `holiday_by_rule`, 400 `invalid_date`, 403 for a Viewer. */
  changeHolidayDate(calendarId: string, holidayId: string, date: string): Observable<AdminHoliday>;
  /** 400 `reason_required`; 409 `holiday_year_published`, `holiday_year_empty`; 403 for a Viewer. */
  publishHolidayYear(
    calendarId: string,
    year: number,
    reason: string,
  ): Observable<HolidayYearPublished>;
  waiting(): Observable<AdminWaiting>;
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

  notificationHolds(): Observable<AdminNotificationHolds> {
    return this.http.get<AdminNotificationHolds>('/api/admin/notifications/holds');
  }

  searchHoldPopkins(text: string): Observable<HoldPopkinMatch[]> {
    return this.http.get<HoldPopkinMatch[]>('/api/admin/notifications/holds/popkin-search', {
      params: { q: text },
    });
  }

  holdPopkin(popkinId: string, reason: string | null): Observable<AdminNotificationHold> {
    return this.http.post<AdminNotificationHold>('/api/admin/notifications/holds', {
      popkinId,
      reason,
    });
  }

  releaseHold(holdId: string, reason: string | null): Observable<void> {
    return this.http.post<void>(`/api/admin/notifications/holds/${holdId}/release`, { reason });
  }

  notificationDefaults(): Observable<AdminNotificationDefaults> {
    return this.http.get<AdminNotificationDefaults>('/api/admin/notifications/defaults');
  }

  changeNotificationDefaults(
    defaults: NotificationDefaultsChange,
    reason: string | null,
  ): Observable<AdminNotificationDefaults> {
    return this.http.put<AdminNotificationDefaults>('/api/admin/notifications/defaults', {
      ...defaults,
      reason,
    });
  }

  limits(): Observable<AdminLimits> {
    return this.http.get<AdminLimits>('/api/admin/limits');
  }

  changeLimits(changes: LimitChangeRequest[], reason: string | null): Observable<AdminLimits> {
    return this.http.put<AdminLimits>('/api/admin/limits', { changes, reason });
  }

  holidayCalendars(): Observable<AdminHolidayCalendars> {
    return this.http.get<AdminHolidayCalendars>('/api/admin/holiday-calendars');
  }

  holidayCalendar(calendarId: string, year?: number): Observable<AdminHolidayCalendar> {
    return this.http.get<AdminHolidayCalendar>(
      `/api/admin/holiday-calendars/${calendarId}`,
      year === undefined ? {} : { params: { year } },
    );
  }

  changeHolidayDate(calendarId: string, holidayId: string, date: string): Observable<AdminHoliday> {
    return this.http.put<AdminHoliday>(
      `/api/admin/holiday-calendars/${calendarId}/holidays/${holidayId}`,
      { date },
    );
  }

  publishHolidayYear(
    calendarId: string,
    year: number,
    reason: string,
  ): Observable<HolidayYearPublished> {
    return this.http.post<HolidayYearPublished>(
      `/api/admin/holiday-calendars/${calendarId}/years/${year}/publish`,
      { reason },
    );
  }

  waiting(): Observable<AdminWaiting> {
    return this.http.get<AdminWaiting>('/api/admin/waiting');
  }
}
