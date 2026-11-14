import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { PhotoDetailView } from '../../models/photos';
import { photoName, photoTime } from './album-days';
import { PhotoReaction, applyReactionToggle } from './photo-reactions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { PHOTOS_API } from './photos-api';

/**
 * One photo, full screen (docs/detailed-designs/photos/view-photo): who added it and when,
 * the photos either side, and what to do when it does not load. One per screen.
 */
@Injectable()
export class PhotoViewStore {
  private readonly api = inject(PHOTOS_API);
  private readonly document = inject(DOCUMENT);

  constructor() {
    inject(POPKIN_REALTIME)
      .photoDeleted$.pipe(takeUntilDestroyed())
      .subscribe(({ popkinId, photoId }) => {
        if (popkinId === this.popkinId) this.removed(photoId);
      });
  }

  private popkinId = '';
  private photoId = '';
  private reading?: Subscription;

  /** `removed`: the photo was deleted while it was open. */
  readonly state = signal<'loading' | 'ready' | 'error' | 'not-found' | 'removed'>('loading');
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

  /** The reactions the server last answered, and the presses still to send, in order. */
  private readonly confirmed = signal<readonly PhotoReaction[]>([]);
  private readonly pressed = signal<readonly string[]>([]);
  private sending?: Subscription;
  /** The chips as the member sees them: the server's, with their presses applied (L2-034 AC2). */
  readonly reactions = computed(() =>
    this.pressed().reduce<PhotoReaction[]>(
      (reactions, emoji) => applyReactionToggle(reactions, emoji),
      [...this.confirmed()],
    ),
  );
  /** A reaction did not save and its count went back (L2-034 AC4). */
  readonly reactionFailed = signal(false);
  /** "Save photo" asking for its address, and whether it failed (L2-036 AC1). */
  readonly saving = signal(false);
  readonly saveFailed = signal(false);
  /** Deleting the photo, and whether it failed (L2-036 AC2). */
  readonly deleting = signal(false);
  readonly deleteFailed = signal(false);

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

  /**
   * Gives the reaction, or takes it back, at once; the requests go one at a time, so two presses
   * cannot cross, and a failed one is undone (L2-034 AC2 to AC4).
   */
  react(emoji: string): void {
    this.pressed.update((pressed) => [...pressed, emoji]);
    if (!this.sending) this.sendNext();
  }

  dismissReactionFailure(): void {
    this.reactionFailed.set(false);
  }

  /** Downloads the photo at the size it was added, through a short-lived address (L2-036 AC1). */
  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.saveFailed.set(false);
    this.api.getDownload(this.popkinId, this.photoId).subscribe({
      next: ({ url }) => {
        const link = this.document.createElement('a');
        link.href = url;
        link.rel = 'noopener';
        link.click();
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.saveFailed.set(true);
      },
    });
  }

  dismissSaveFailure(): void {
    this.saveFailed.set(false);
  }

  /** Deletes the photo, once confirmed; true when it is gone (L2-036 AC2). */
  async remove(): Promise<boolean> {
    this.deleting.set(true);
    this.deleteFailed.set(false);
    try {
      await firstValueFrom(this.api.deletePhoto(this.popkinId, this.photoId), {
        defaultValue: undefined,
      });
      return true;
    } catch {
      this.deleteFailed.set(true);
      return false;
    } finally {
      this.deleting.set(false);
    }
  }

  /** A photo was deleted by someone: the one open reads as removed (L2-036 AC3). */
  private removed(photoId: string): void {
    if (photoId === this.photoId) {
      this.reading?.unsubscribe();
      this.state.set('removed');
    }
  }

  private sendNext(): void {
    const emoji = this.pressed()[0];
    if (emoji === undefined) {
      this.sending = undefined;
      return;
    }
    const mine = this.confirmed().some((reaction) => reaction.emoji === emoji && reaction.mine);
    const request = mine
      ? this.api.removeReaction(this.popkinId, this.photoId, emoji)
      : this.api.addReaction(this.popkinId, this.photoId, emoji);
    const done = (answer?: PhotoReaction[]) => {
      if (answer) this.confirmed.set(answer);
      else this.reactionFailed.set(true);
      this.pressed.update((pressed) => pressed.slice(1));
      this.sendNext();
    };
    this.sending = request.subscribe({ next: (answer) => done(answer), error: () => done() });
  }

  /** The newer photo of the album, or the older one; null at its ends (L2-033 AC3). */
  neighbour(side: 'previous' | 'next'): string | null {
    const photo = this.state() === 'ready' ? this.photo() : null;
    return (side === 'previous' ? photo?.previousPhotoId : photo?.nextPhotoId) ?? null;
  }

  private read(): void {
    this.reading?.unsubscribe();
    this.sending?.unsubscribe();
    this.sending = undefined;
    this.pressed.set([]);
    this.state.set('loading');
    this.reading = this.api.getPhoto(this.popkinId, this.photoId).subscribe({
      next: (photo) => {
        this.photo.set(photo);
        this.confirmed.set(photo.reactions);
        this.state.set('ready');
      },
      error: (error: unknown) =>
        this.state.set(
          error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'error',
        ),
    });
  }
}
