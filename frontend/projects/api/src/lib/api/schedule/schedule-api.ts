import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SetTimeOffBody, TimeOffWeekView } from '../../models/schedule';

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

  /**
   * Sets my own time off for a week, Monday to Friday, and answers the week (L2-073). Refused
   * with 403 for another member and 409 `popkin_wrapped_up` once the Popkin has wrapped up.
   */
  setTimeOff(
    popkinId: string,
    membershipId: string,
    body: SetTimeOffBody,
  ): Observable<TimeOffWeekView>;
}

export const SCHEDULE_API = new InjectionToken<ScheduleApi>('ScheduleApi');

@Injectable()
export class HttpScheduleApi implements ScheduleApi {
  private readonly http = inject(HttpClient);

  timeOff(popkinId: string, at: { week?: string; today?: string }): Observable<TimeOffWeekView> {
    const params: Record<string, string> = at.week ? { week: at.week } : { today: at.today ?? '' };
    return this.http.get<TimeOffWeekView>(`${schedule(popkinId)}/time-off`, { params });
  }

  setTimeOff(
    popkinId: string,
    membershipId: string,
    body: SetTimeOffBody,
  ): Observable<TimeOffWeekView> {
    return this.http.put<TimeOffWeekView>(`${schedule(popkinId)}/time-off/${membershipId}`, body);
  }
}

const schedule = (popkinId: string) => `/api/popkins/${popkinId}/schedule`;
