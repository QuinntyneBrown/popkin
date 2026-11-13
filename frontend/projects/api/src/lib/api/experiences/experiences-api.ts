import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ExperiencesSummaryView } from '../../models/home';

/** A Popkin's experiences (docs/detailed-designs/experiences). The rest arrives with journey 8. */
export interface ExperiencesApi {
  /** What the Popkin's home shows. 404 `popkin_not_found` for someone who is not a member. */
  getSummary(popkinId: string): Observable<ExperiencesSummaryView>;
}

export const EXPERIENCES_API = new InjectionToken<ExperiencesApi>('ExperiencesApi');

@Injectable()
export class HttpExperiencesApi implements ExperiencesApi {
  private readonly http = inject(HttpClient);

  getSummary(popkinId: string): Observable<ExperiencesSummaryView> {
    return this.http.get<ExperiencesSummaryView>(
      `/api/popkins/${encodeURIComponent(popkinId)}/experiences/summary`,
    );
  }
}
