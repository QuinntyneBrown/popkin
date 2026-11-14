import { HttpClient, HttpEvent, HttpEventType, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { PhotosSummaryView } from '../../models/home';
import {
  AlbumFilter,
  AlbumPageView,
  PhotoDetailView,
  PhotoSummaryView,
  PhotoUploadEvent,
} from '../../models/photos';
import { PhotoReaction } from './photo-reactions';

/** A Popkin's photos (docs/detailed-designs/photos). */
export interface PhotosApi {
  /** What the Popkin's home shows. 404 `popkin_not_found` for someone who is not a member. */
  getSummary(popkinId: string): Observable<PhotosSummaryView>;
  /** A page of the album, the latest first, 60 at a time (L2-032). 404 `popkin_not_found`. */
  getAlbum(popkinId: string, filter: AlbumFilter, cursor?: string): Observable<AlbumPageView>;
  /** One photo with its neighbours (L2-033). 404 `popkin_not_found`, `photo_not_found`. */
  getPhoto(popkinId: string, photoId: string): Observable<PhotoDetailView>;
  /**
   * Adds one photo, saying how far it is and then what it became (L2-031). 400
   * `photo_type_not_allowed`, `photo_too_large`, `caption_too_long`; 409 `popkin_wrapped_up`;
   * 429 `rate_limited`.
   */
  upload(popkinId: string, file: File, caption: string): Observable<PhotoUploadEvent>;
  /** Gives a reaction; answers the photo's reactions (L2-034). 400 `emoji_not_allowed`; 409. */
  addReaction(popkinId: string, photoId: string, emoji: string): Observable<PhotoReaction[]>;
  /** Takes a reaction back; answers the photo's reactions (L2-034 AC3). */
  removeReaction(popkinId: string, photoId: string, emoji: string): Observable<PhotoReaction[]>;
}

export const PHOTOS_API = new InjectionToken<PhotosApi>('PhotosApi');

@Injectable()
export class HttpPhotosApi implements PhotosApi {
  private readonly http = inject(HttpClient);

  getSummary(popkinId: string): Observable<PhotosSummaryView> {
    return this.http.get<PhotosSummaryView>(`${photos(popkinId)}/summary`);
  }

  getAlbum(popkinId: string, filter: AlbumFilter, cursor?: string): Observable<AlbumPageView> {
    return this.http.get<AlbumPageView>(photos(popkinId), {
      params: new HttpParams({ fromObject: cursor ? { filter, cursor } : { filter } }),
    });
  }

  getPhoto(popkinId: string, photoId: string): Observable<PhotoDetailView> {
    return this.http.get<PhotoDetailView>(`${photos(popkinId)}/${encodeURIComponent(photoId)}`);
  }

  upload(popkinId: string, file: File, caption: string): Observable<PhotoUploadEvent> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (caption) form.append('caption', caption);
    return this.http
      .post<PhotoSummaryView>(photos(popkinId), form, { reportProgress: true, observe: 'events' })
      .pipe(
        map(uploadEvent),
        filter((event) => event !== null),
      );
  }

  addReaction(popkinId: string, photoId: string, emoji: string): Observable<PhotoReaction[]> {
    return this.http.put<PhotoReaction[]>(reaction(popkinId, photoId, emoji), null);
  }

  removeReaction(popkinId: string, photoId: string, emoji: string): Observable<PhotoReaction[]> {
    return this.http.delete<PhotoReaction[]>(reaction(popkinId, photoId, emoji));
  }
}

function reaction(popkinId: string, photoId: string, emoji: string): string {
  return `${photos(popkinId)}/${encodeURIComponent(photoId)}/reactions/${encodeURIComponent(emoji)}`;
}

function uploadEvent(event: HttpEvent<PhotoSummaryView>): PhotoUploadEvent | null {
  if (event.type === HttpEventType.UploadProgress) {
    return { kind: 'progress', fraction: event.total ? event.loaded / event.total : 0 };
  }
  if (event.type === HttpEventType.Response && event.body) {
    return { kind: 'done', photo: event.body };
  }
  return null;
}

function photos(popkinId: string): string {
  return `/api/popkins/${encodeURIComponent(popkinId)}/photos`;
}
