import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AlbumExportView, RecapView } from '../../models/recap';

/**
 * The recap of a wrapped-up Popkin (docs/detailed-designs/wrap-up/recap). Every call answers
 * 404 `popkin_not_found` for someone who is not a member and 409 `popkin_active` for a Popkin
 * that has not wrapped up.
 */
export interface RecapApi {
  getRecap(popkinId: string): Observable<RecapView>;
  /** Starts preparing the album's zip, or answers the one already prepared. 409 `album_removed`. */
  startAlbumExport(popkinId: string): Observable<AlbumExportView>;
  /** How far the zip is. 404 `export_not_found`. */
  getAlbumExport(popkinId: string, exportId: string): Observable<AlbumExportView>;
}

export const RECAP_API = new InjectionToken<RecapApi>('RecapApi');

@Injectable()
export class HttpRecapApi implements RecapApi {
  private readonly http = inject(HttpClient);

  getRecap(popkinId: string): Observable<RecapView> {
    return this.http.get<RecapView>(recap(popkinId));
  }

  startAlbumExport(popkinId: string): Observable<AlbumExportView> {
    return this.http.post<AlbumExportView>(`${recap(popkinId)}/album-exports`, null);
  }

  getAlbumExport(popkinId: string, exportId: string): Observable<AlbumExportView> {
    return this.http.get<AlbumExportView>(
      `${recap(popkinId)}/album-exports/${encodeURIComponent(exportId)}`,
    );
  }
}

const recap = (popkinId: string) => `/api/popkins/${encodeURIComponent(popkinId)}/recap`;
