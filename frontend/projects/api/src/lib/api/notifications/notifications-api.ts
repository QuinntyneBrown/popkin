import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationSettingsView } from '../../models/notifications';

/** The signed-in person's notification settings (docs/detailed-designs/notifications/notification-settings). */
export interface NotificationsApi {
  settings(): Observable<NotificationSettingsView>;
}

export const NOTIFICATIONS_API = new InjectionToken<NotificationsApi>('NotificationsApi');

@Injectable()
export class HttpNotificationsApi implements NotificationsApi {
  private readonly http = inject(HttpClient);

  settings(): Observable<NotificationSettingsView> {
    return this.http.get<NotificationSettingsView>('/api/me/notifications');
  }
}
