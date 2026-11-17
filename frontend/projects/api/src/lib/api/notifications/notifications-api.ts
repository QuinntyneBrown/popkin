import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  NotificationFrequency,
  NotificationKind,
  NotificationSettingsView,
  PopkinNotificationLevel,
} from '../../models/notifications';
import { PushSubscriptionRequest } from '../../models/reminders';

/** A change of one kind on one or both channels. */
export interface NotificationKindChange {
  email?: boolean;
  phone?: boolean;
}

/** The signed-in person's notification settings (docs/detailed-designs/notifications/notification-settings). */
export interface NotificationsApi {
  settings(): Observable<NotificationSettingsView>;
  /** 400 `invalid_kind`, `notification_required` or `nothing_to_change`. */
  setKind(kind: NotificationKind, change: NotificationKindChange): Observable<void>;
  /** 409 `no_email_address` to turn it on without one. */
  setEmail(on: boolean): Observable<void>;
  /** 400 `invalid_frequency`. */
  setFrequency(frequency: NotificationFrequency): Observable<void>;
  /** 400 `invalid_level`, 404 `popkin_not_found`, 409 `popkin_wrapped_up` (L2-158). */
  setLevel(popkinId: string, level: PopkinNotificationLevel): Observable<void>;
  /** The device's IANA zone, sent once when the app starts (L2-161 AC7); 400 `invalid_time_zone`. */
  saveTimeZone(zone: string): Observable<void>;
  /** Web Push's public key, empty while none is configured (ADR 0028). */
  pushKey(): Observable<{ publicKey: string }>;
  savePushSubscription(request: PushSubscriptionRequest): Observable<void>;
  removePushSubscription(endpoint: string): Observable<void>;
}

export const NOTIFICATIONS_API = new InjectionToken<NotificationsApi>('NotificationsApi');

@Injectable()
export class HttpNotificationsApi implements NotificationsApi {
  private readonly http = inject(HttpClient);

  settings(): Observable<NotificationSettingsView> {
    return this.http.get<NotificationSettingsView>('/api/me/notifications');
  }

  setKind(kind: NotificationKind, change: NotificationKindChange): Observable<void> {
    return this.http.put<void>(`/api/me/notifications/kinds/${kind}`, change);
  }

  setEmail(on: boolean): Observable<void> {
    return this.http.put<void>('/api/me/notifications/email', { on });
  }

  setFrequency(frequency: NotificationFrequency): Observable<void> {
    return this.http.put<void>('/api/me/notifications/frequency', { frequency });
  }

  saveTimeZone(zone: string): Observable<void> {
    return this.http.put<void>('/api/me/time-zone', { zone });
  }

  setLevel(popkinId: string, level: PopkinNotificationLevel): Observable<void> {
    return this.http.put<void>(`/api/me/notifications/popkins/${popkinId}`, { level });
  }

  pushKey(): Observable<{ publicKey: string }> {
    return this.http.get<{ publicKey: string }>('/api/me/push-key');
  }

  savePushSubscription(request: PushSubscriptionRequest): Observable<void> {
    return this.http.post<void>('/api/me/push-subscriptions', request);
  }

  removePushSubscription(endpoint: string): Observable<void> {
    return this.http.delete<void>('/api/me/push-subscriptions', { params: { endpoint } });
  }
}
