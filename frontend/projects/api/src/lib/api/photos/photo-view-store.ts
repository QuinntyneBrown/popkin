import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { PhotoDetailView } from '../../models/photos';
import { photoName, photoTime } from './album-days';
import { PhotoReaction, applyReactionToggle } from './photo-reactions';
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
