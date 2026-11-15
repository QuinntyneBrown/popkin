import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PlanBoardView } from '../../models/plan';

/**
 * A Popkin's Plan (docs/detailed-designs/plan). Every call answers 404 `popkin_not_found` for
 * someone who is not a member, and 404 `feature_off` while Plan is switched off (L2-077 AC3).
 */
export interface PlanApi {
  /** The plan board (L2-068): the sprint, every story and how the sprint is going. */
  board(popkinId: string): Observable<PlanBoardView>;
}

export const PLAN_API = new InjectionToken<PlanApi>('PlanApi');

@Injectable()
export class HttpPlanApi implements PlanApi {
  private readonly http = inject(HttpClient);

  board(popkinId: string): Observable<PlanBoardView> {
    return this.http.get<PlanBoardView>(plan(popkinId));
  }
}

const plan = (popkinId: string) => `/api/popkins/${popkinId}/plan`;
