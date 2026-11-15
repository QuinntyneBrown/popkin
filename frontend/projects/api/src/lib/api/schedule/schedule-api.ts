import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SetTimeOffBody, TimeOffWeekView } from '../../models/schedule';
import { ScheduleSummaryView, SetHoursBody, ThisWeekView } from '../../models/this-week';

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

  /** This week (L2-074): seven days from `from`, the viewer's today. */
  thisWeek(popkinId: string, from: string): Observable<ThisWeekView>;

  /**
   * Sets my own working hours for the seven days from `from`, and answers this week (L2-074
   * AC8). Refused with 403 for another member and 409 `popkin_wrapped_up` once wrapped up.
   */
  setHours(popkinId: string, membershipId: string, body: SetHoursBody): Observable<ThisWeekView>;

  /** The home's Schedule section (L2-075 AC2): seven days from `from`, the viewer's today. */
  summary(popkinId: string, from: string): Observable<ScheduleSummaryView>;
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

  thisWeek(popkinId: string, from: string): Observable<ThisWeekView> {
    return this.http.get<ThisWeekView>(`${schedule(popkinId)}/week`, { params: { from } });
  }

  setHours(popkinId: string, membershipId: string, body: SetHoursBody): Observable<ThisWeekView> {
    return this.http.put<ThisWeekView>(`${schedule(popkinId)}/hours/${membershipId}`, body);
  }

  summary(popkinId: string, from: string): Observable<ScheduleSummaryView> {
    return this.http.get<ScheduleSummaryView>(`${schedule(popkinId)}/summary`, {
      params: { from },
    });
  }
}

const schedule = (popkinId: string) => `/api/popkins/${popkinId}/schedule`;
