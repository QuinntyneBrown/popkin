import { HttpClient, HttpEvent, HttpEventType, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { PhotosSummaryView } from '../../models/home';
import {
  AlbumFilter,
  AlbumPageView,
  PhotoCommentView,
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
  /** A photo's comments, oldest first (L2-035 AC1). */
  getComments(popkinId: string, photoId: string): Observable<PhotoCommentView[]>;
  /** Adds one (L2-035 AC2). 400 `comment_empty`, `comment_too_long`; 409; 429. */
  addComment(popkinId: string, photoId: string, text: string): Observable<PhotoCommentView>;
  /** Deletes the member's own (L2-035 AC5). 403 `comment_not_yours`; 404 `comment_not_found`. */
  deleteComment(popkinId: string, photoId: string, commentId: string): Observable<void>;
  /** A short-lived address of the photo at the size it was added, as a download (L2-036 AC1). */
  getDownload(popkinId: string, photoId: string): Observable<{ url: string; expiresAt: string }>;
  /** Deletes it: the uploader, or the Host (L2-036 AC2). 403 `photo_not_yours`; 409. */
  deletePhoto(popkinId: string, photoId: string): Observable<void>;
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

  getDownload(popkinId: string, photoId: string): Observable<{ url: string; expiresAt: string }> {
    return this.http.get<{ url: string; expiresAt: string }>(
      `${photos(popkinId)}/${encodeURIComponent(photoId)}/download`,
    );
  }

  deletePhoto(popkinId: string, photoId: string): Observable<void> {
    return this.http.delete<void>(`${photos(popkinId)}/${encodeURIComponent(photoId)}`);
  }

  getComments(popkinId: string, photoId: string): Observable<PhotoCommentView[]> {
    return this.http.get<PhotoCommentView[]>(comments(popkinId, photoId));
  }

  addComment(popkinId: string, photoId: string, text: string): Observable<PhotoCommentView> {
    return this.http.post<PhotoCommentView>(comments(popkinId, photoId), { text });
  }

  deleteComment(popkinId: string, photoId: string, commentId: string): Observable<void> {
    return this.http.delete<void>(
      `${comments(popkinId, photoId)}/${encodeURIComponent(commentId)}`,
    );
  }
}

function comments(popkinId: string, photoId: string): string {
  return `${photos(popkinId)}/${encodeURIComponent(photoId)}/comments`;
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
