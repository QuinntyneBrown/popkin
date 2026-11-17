import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  NotificationFrequency,
  NotificationKind,
  NotificationSettingsView,
} from '../../models/notifications';

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
}
