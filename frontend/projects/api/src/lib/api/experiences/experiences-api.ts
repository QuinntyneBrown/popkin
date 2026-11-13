import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ExperienceCardView,
  ExperienceCommentView,
  ExperienceDetailView,
  ExperienceDraft,
  ExperienceFilter,
  KeenView,
  RatingResultView,
} from '../../models/experiences';
import { ExperiencesSummaryView } from '../../models/home';

/**
 * A Popkin's experiences (docs/detailed-designs/experiences). Every call answers 404
 * `popkin_not_found` for someone who is not a member, and a change answers 409
 * `popkin_wrapped_up` once the Popkin has wrapped up.
 */
export interface ExperiencesApi {
  /** What the Popkin's home shows. */
  getSummary(popkinId: string): Observable<ExperiencesSummaryView>;
  /** The experiences, the newest first; "did" includes restaurants (L2-037). */
  list(popkinId: string, filter: ExperienceFilter): Observable<ExperienceCardView[]>;
  /** One experience with its score and comments (L2-038). 404 `experience_not_found`. */
  get(popkinId: string, experienceId: string): Observable<ExperienceDetailView>;
  /** Sets the member's one rating (L2-039). 400 `stars_out_of_range`; 409 `experience_not_rateable`. */
  rate(popkinId: string, experienceId: string, stars: number): Observable<RatingResultView>;
  /** Adds or replaces the member's comment (L2-041). 400 `comment_required`, `comment_too_long`; 409 `rating_required`. */
  comment(popkinId: string, experienceId: string, text: string): Observable<ExperienceCommentView>;
  /**
   * Says the member is keen on an idea, or takes it back (L2-042 AC2, AC3), and answers who is
   * keen. 409 `experience_not_wanted`.
   */
  setKeen(popkinId: string, experienceId: string, keen: boolean): Observable<KeenView>;
  /**
   * "We did this": the idea becomes something the group did (L2-042 AC4), answered as its page
   * shows it. 403 `not_experience_sharer`; 409 `experience_not_wanted`.
   */
  markDone(popkinId: string, experienceId: string): Observable<ExperienceDetailView>;
  /** Shares an experience (L2-040). 400 naming `title`, `when`, `place` or `picture`. */
  share(popkinId: string, draft: ExperienceDraft): Observable<ExperienceCardView>;
  /** Changes one's own experience. 403 `not_experience_sharer`. */
  edit(
    popkinId: string,
    experienceId: string,
    draft: ExperienceDraft,
  ): Observable<ExperienceCardView>;
  /** Deletes one's own experience, or any as the Host. 403 `not_experience_sharer`. */
  remove(popkinId: string, experienceId: string): Observable<void>;
}

export const EXPERIENCES_API = new InjectionToken<ExperiencesApi>('ExperiencesApi');

@Injectable()
export class HttpExperiencesApi implements ExperiencesApi {
  private readonly http = inject(HttpClient);

  getSummary(popkinId: string): Observable<ExperiencesSummaryView> {
    return this.http.get<ExperiencesSummaryView>(`${experiences(popkinId)}/summary`);
  }

  list(popkinId: string, filter: ExperienceFilter): Observable<ExperienceCardView[]> {
    return this.http.get<ExperienceCardView[]>(experiences(popkinId), { params: { filter } });
  }

  get(popkinId: string, experienceId: string): Observable<ExperienceDetailView> {
    return this.http.get<ExperienceDetailView>(one(popkinId, experienceId));
  }

  rate(popkinId: string, experienceId: string, stars: number): Observable<RatingResultView> {
    return this.http.put<RatingResultView>(`${one(popkinId, experienceId)}/my-rating`, { stars });
  }

  comment(popkinId: string, experienceId: string, text: string): Observable<ExperienceCommentView> {
    return this.http.put<ExperienceCommentView>(
      `${one(popkinId, experienceId)}/my-rating/comment`,
      { text },
    );
  }

  setKeen(popkinId: string, experienceId: string, keen: boolean): Observable<KeenView> {
    const url = `${one(popkinId, experienceId)}/keen`;
    return keen ? this.http.put<KeenView>(url, null) : this.http.delete<KeenView>(url);
  }

  markDone(popkinId: string, experienceId: string): Observable<ExperienceDetailView> {
    return this.http.post<ExperienceDetailView>(`${one(popkinId, experienceId)}/done`, null);
  }

  share(popkinId: string, draft: ExperienceDraft): Observable<ExperienceCardView> {
    return this.http.post<ExperienceCardView>(experiences(popkinId), form(draft));
  }

  edit(
    popkinId: string,
    experienceId: string,
    draft: ExperienceDraft,
  ): Observable<ExperienceCardView> {
    return this.http.patch<ExperienceCardView>(one(popkinId, experienceId), form(draft));
  }

  remove(popkinId: string, experienceId: string): Observable<void> {
    return this.http.delete<void>(one(popkinId, experienceId));
  }
}

function form(draft: ExperienceDraft): FormData {
  const body = new FormData();
  body.append('title', draft.title.trim());
  body.append('kind', draft.kind);
  body.append('when', draft.when.trim());
  body.append('place', draft.place.trim());
  if (draft.picture) body.append('picture', draft.picture, draft.picture.name);
  if (draft.removePicture) body.append('removePicture', 'true');
  return body;
}

function experiences(popkinId: string): string {
  return `/api/popkins/${encodeURIComponent(popkinId)}/experiences`;
}

function one(popkinId: string, experienceId: string): string {
  return `${experiences(popkinId)}/${encodeURIComponent(experienceId)}`;
}
