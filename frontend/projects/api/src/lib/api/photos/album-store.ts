import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, filter } from 'rxjs';
import { AlbumFilter, AlbumPageView, PhotoSummaryView } from '../../models/photos';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { albumLine, groupPhotosByDay } from './album-days';
import { PHOTOS_API } from './photos-api';

export type AlbumState = 'loading' | 'ready' | 'empty' | 'no-results' | 'error' | 'not-found';

/**
 * The album of one Popkin (docs/detailed-designs/photos/browse-album): its counts, the photos
 * of the filter under their days, more of them as the member scrolls, and the photos others
 * add while it is open. One per screen; the page provides it.
 */
@Injectable()
export class AlbumStore {
  private readonly api = inject(PHOTOS_API);
  private readonly realtime = inject(POPKIN_REALTIME);

  private popkinId = '';
  private reading?: Subscription;
  private readingMore?: Subscription;
  /** Pages shown; a fresh first page keeps the cursor of the later ones. */
  private pages = 0;
  private lastSeen: string | null = null;
  private readonly cursor = signal<string | null>(null);
  private readonly album = signal<AlbumPageView | null>(null);
  private readonly items = signal<PhotoSummaryView[]>([]);

  readonly state = signal<AlbumState>('loading');
  readonly filter = signal<AlbumFilter>('everyone');
  /** A later page: on its way, or failed while what is shown stays (L2-032 AC6). */
  readonly moreState = signal<'idle' | 'loading' | 'error'>('idle');
  readonly hasMore = computed(() => this.cursor() !== null);
  readonly days = computed(() => groupPhotosByDay(this.items(), new Date(), this.filter()));
  /** "48 photos from 11 people", the whole album's whatever the filter. */
  readonly line = computed(() => {
    const album = this.album();
    return album ? albumLine(album.photoCount, album.contributorCount) : '';
  });
  readonly contributors = computed(() => this.album()?.contributors ?? []);
  readonly contributorCount = computed(() => this.album()?.contributorCount ?? 0);
  /** False once the album says the Popkin has wrapped up (L2-045 AC3). */
  readonly canAdd = computed(() => this.album()?.canAdd ?? true);

  constructor() {
    const mine = takeUntilDestroyed(inject(DestroyRef));
    this.realtime.photosAdded$
      .pipe(
        filter((added) => added.popkinId === this.popkinId),
        mine,
      )
      .subscribe(() => this.refresh());
    this.realtime.reconnected$.pipe(mine).subscribe(() => this.refresh());
  }

  open(popkinId: string): void {
    this.realtime.start();
    // Back from a photo: what was shown stays, and the latest is read quietly (L2-033 AC2).
    if (popkinId === this.popkinId && this.state() === 'ready') {
      this.refresh();
      return;
    }
    this.popkinId = popkinId;
    this.filter.set('everyone');
    this.read();
  }

  /** The photo the member is looking at, full screen. */
  seen(photoId: string): void {
    this.lastSeen = photoId;
  }

  /** The photo the member last looked at, to return them to it; told once. */
  takeLastSeen(): string | null {
    const photoId = this.lastSeen;
    this.lastSeen = null;
    return photoId;
  }

  /** Reads the album again, after it failed to open. */
  retry(): void {
    this.read();
  }

  show(filter: AlbumFilter): void {
    if (filter === this.filter()) return;
    this.filter.set(filter);
    this.read();
  }

  /** The next page, after what is shown; again after it failed. */
  more(): void {
    const cursor = this.cursor();
    if (!cursor || this.moreState() === 'loading' || this.state() !== 'ready') return;
    this.moreState.set('loading');
    this.readingMore = this.api.getAlbum(this.popkinId, this.filter(), cursor).subscribe({
      next: (page) => {
        const shown = new Set(this.items().map((item) => item.id));
        this.items.update((items) => [...items, ...page.items.filter((i) => !shown.has(i.id))]);
        this.album.set(page);
        this.cursor.set(page.nextCursor);
        this.pages++;
        this.moreState.set('idle');
      },
      error: (error: unknown) => {
        if (notFound(error)) this.state.set('not-found');
        else this.moreState.set('error');
      },
    });
  }

  /**
   * Reads the latest photos again and puts the new ones in their place, keeping what is
   * shown until the answer arrives, and if it fails (L2-031 AC7).
   */
  refresh(): void {
    if (!['ready', 'empty', 'no-results'].includes(this.state())) return;
    this.reading?.unsubscribe();
    this.reading = this.api.getAlbum(this.popkinId, this.filter()).subscribe({
      next: (page) => {
        const fresh = new Set(page.items.map((item) => item.id));
        const merged = [...page.items, ...this.items().filter((item) => !fresh.has(item.id))];
        // A stable sort: photos of one moment keep the order the album gave them.
        merged.sort((a, b) => Date.parse(b.takenAt) - Date.parse(a.takenAt));
        this.items.set(merged);
        this.album.set(page);
        if (this.pages <= 1) {
          this.cursor.set(page.nextCursor);
          this.pages = 1;
        }
        this.settle(page);
      },
      error: (error: unknown) => {
        if (notFound(error)) this.state.set('not-found');
      },
    });
  }

  private read(): void {
    this.reading?.unsubscribe();
    this.readingMore?.unsubscribe();
    this.moreState.set('idle');
    this.state.set('loading');
    this.items.set([]);
    this.cursor.set(null);
    this.pages = 0;
    this.reading = this.api.getAlbum(this.popkinId, this.filter()).subscribe({
      next: (page) => {
        this.album.set(page);
        this.items.set(page.items);
        this.cursor.set(page.nextCursor);
        this.pages = 1;
        this.settle(page);
      },
      error: (error: unknown) => this.state.set(notFound(error) ? 'not-found' : 'error'),
    });
  }

  private settle(page: AlbumPageView): void {
    if (page.photoCount === 0) this.state.set('empty');
    else if (this.items().length === 0) this.state.set('no-results');
    else this.state.set('ready');
  }
}

function notFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}
