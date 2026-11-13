import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PhotosSummaryView } from '../../models/home';

/** A Popkin's photos (docs/detailed-designs/photos). The album itself arrives with journey 5. */
export interface PhotosApi {
  /** What the Popkin's home shows. 404 `popkin_not_found` for someone who is not a member. */
  getSummary(popkinId: string): Observable<PhotosSummaryView>;
}

export const PHOTOS_API = new InjectionToken<PhotosApi>('PhotosApi');

@Injectable()
export class HttpPhotosApi implements PhotosApi {
  private readonly http = inject(HttpClient);

  getSummary(popkinId: string): Observable<PhotosSummaryView> {
    return this.http.get<PhotosSummaryView>(
      `/api/popkins/${encodeURIComponent(popkinId)}/photos/summary`,
    );
  }
}
