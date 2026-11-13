import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { PhotoDetailView } from '../../models/photos';
import { photoName, photoTime } from './album-days';
import { PHOTOS_API } from './photos-api';

/**
 * One photo, full screen (docs/detailed-designs/photos/view-photo): who added it and when,
 * the photos either side, and what to do when it does not load. One per screen.
 */
@Injectable()
export class PhotoViewStore {
  private readonly api = inject(PHOTOS_API);

  private popkinId = '';
  private photoId = '';
  private reading?: Subscription;

  readonly state = signal<'loading' | 'ready' | 'error' | 'not-found'>('loading');
  readonly photo = signal<PhotoDetailView | null>(null);
  /** "Saturday, 7:02 am": when it was added (L2-033 AC1). */
  readonly when = computed(() => {
    const photo = this.photo();
    return photo ? photoTime(new Date(photo.addedAt), new Date()) : '';
  });
  /** What assistive technology reads for the photo: its caption, or who added it. */
  readonly name = computed(() => {
    const photo = this.photo();
    return photo ? photoName(photo) : '';
  });

  open(popkinId: string, photoId: string): void {
    this.popkinId = popkinId;
    this.photoId = photoId;
    this.read();
  }

  /** Reads the photo again: its address may have expired (L2-033 AC4). */
  retry(): void {
    this.read();
  }

  /** The image did not arrive, though the photo answered. */
  imageFailed(): void {
    this.state.set('error');
  }

  /** The newer photo of the album, or the older one; null at its ends (L2-033 AC3). */
  neighbour(side: 'previous' | 'next'): string | null {
    const photo = this.state() === 'ready' ? this.photo() : null;
    return (side === 'previous' ? photo?.previousPhotoId : photo?.nextPhotoId) ?? null;
  }

  private read(): void {
    this.reading?.unsubscribe();
    this.state.set('loading');
    this.reading = this.api.getPhoto(this.popkinId, this.photoId).subscribe({
      next: (photo) => {
        this.photo.set(photo);
        this.state.set('ready');
      },
      error: (error: unknown) =>
        this.state.set(
          error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'error',
        ),
    });
  }
}
