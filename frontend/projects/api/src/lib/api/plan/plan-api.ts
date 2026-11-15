import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  NewStoryRequest,
  PlanBoardView,
  StoryColumn,
  StoryRequest,
  StoryView,
} from '../../models/plan';

/**
 * A Popkin's Plan (docs/detailed-designs/plan). Every call answers 404 `popkin_not_found` for
 * someone who is not a member, and 404 `feature_off` while Plan is switched off (L2-077 AC3).
 */
export interface PlanApi {
  /** The plan board (L2-068): the sprint, every story and how the sprint is going. */
  board(popkinId: string): Observable<PlanBoardView>;
  /** Adds a story to Backlog or To do (L2-069). */
  addStory(popkinId: string, request: NewStoryRequest): Observable<StoryView>;
  /** Saves a change to every field of a story (L2-070 AC3). */
  saveStory(popkinId: string, storyId: string, request: StoryRequest): Observable<StoryView>;
  /** Moves a story to another column, last in it: "Move to …" or "Mark done" (L2-070 AC2). */
  moveStory(popkinId: string, storyId: string, column: StoryColumn): Observable<StoryView>;
  /** Deletes a story: 403 `not_your_story` for anyone but the person who added it, its owner or the Host (L2-070 AC4). */
  deleteStory(popkinId: string, storyId: string): Observable<void>;
}

export const PLAN_API = new InjectionToken<PlanApi>('PlanApi');

@Injectable()
export class HttpPlanApi implements PlanApi {
  private readonly http = inject(HttpClient);

  board(popkinId: string): Observable<PlanBoardView> {
    return this.http.get<PlanBoardView>(plan(popkinId));
  }

  addStory(popkinId: string, request: NewStoryRequest): Observable<StoryView> {
    return this.http.post<StoryView>(`${plan(popkinId)}/stories`, request);
  }

  saveStory(popkinId: string, storyId: string, request: StoryRequest): Observable<StoryView> {
    return this.http.put<StoryView>(`${plan(popkinId)}/stories/${storyId}`, request);
  }

  moveStory(popkinId: string, storyId: string, column: StoryColumn): Observable<StoryView> {
    return this.http.put<StoryView>(`${plan(popkinId)}/stories/${storyId}/column`, { column });
  }

  deleteStory(popkinId: string, storyId: string): Observable<void> {
    return this.http.delete<void>(`${plan(popkinId)}/stories/${storyId}`);
  }
}

const plan = (popkinId: string) => `/api/popkins/${popkinId}/plan`;
