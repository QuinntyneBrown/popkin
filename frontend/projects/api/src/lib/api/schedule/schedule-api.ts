import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TimeOffWeekView } from '../../models/schedule';

/**
 * A Popkin's Schedule (docs/detailed-designs/schedules). Every call answers 404
 * `popkin_not_found` for someone who is not a member, and 404 `feature_off` while Schedules is
 * switched off (L2-077 AC3).
 */
export interface ScheduleApi {
  /**
   * A week of the group's time off (L2-072): `week` names it by any of its days; without one,
   * the event's week, or else the week of the viewer's `today` (L2-072 AC8).
   */
  timeOff(popkinId: string, at: { week?: string; today?: string }): Observable<TimeOffWeekView>;
}

export const SCHEDULE_API = new InjectionToken<ScheduleApi>('ScheduleApi');

@Injectable()
export class HttpScheduleApi implements ScheduleApi {
  private readonly http = inject(HttpClient);

  timeOff(popkinId: string, at: { week?: string; today?: string }): Observable<TimeOffWeekView> {
    const params: Record<string, string> = at.week ? { week: at.week } : { today: at.today ?? '' };
    return this.http.get<TimeOffWeekView>(`${schedule(popkinId)}/time-off`, { params });
  }
}

const schedule = (popkinId: string) => `/api/popkins/${popkinId}/schedule`;
