import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { AlbumStore, ErrorScreens, PhotoViewStore, PopkinFrame, accentOf } from 'api';
import { PhotoViewer } from 'components';

/**
 * One photo, full screen on a dark stage (L2-033): who added it and when, the whole photo and
 * its caption. The arrow keys and a swipe open the photos either side; Close and Escape return
 * to the screen the member came from. Reactions and comments arrive with journey 14.
 */
@Component({
  selector: 'pk-photo-view-page',
  imports: [PhotoViewer],
  providers: [PhotoViewStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-view.page.html',
  host: {
    '(document:keydown.arrowleft)': "go('previous')",
    '(document:keydown.arrowright)': "go('next')",
    '(document:keydown.escape)': 'close()',
  },
})
export class PhotoViewPage {
  /** The route's `:popkinId` and `:photoId`. */
  readonly popkinId = input.required<string>();
  readonly photoId = input.required<string>();

  protected readonly store = inject(PhotoViewStore);
  protected readonly frame = inject(PopkinFrame);
  private readonly album = inject(AlbumStore);
  private readonly errors = inject(ErrorScreens);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  /** Whether another screen of the app opened this one; if not, there is nowhere to go back to. */
  private readonly cameFromTheApp =
    ((this.location.getState() as { navigationId?: number } | null)?.navigationId ?? 1) > 1;

  protected readonly photo = this.store.photo;
  /** The not-found screen takes over; until it does the stage keeps loading. */
  protected readonly state = computed(() => {
    const state = this.store.state();
    if (state === 'removed') return 'error';
    return state === 'not-found' ? 'loading' : state;
  });
  protected readonly avatar = computed(() => {
    const avatar = this.photo()?.uploader.avatar;
    return avatar ? { ...avatar, accent: accentOf(avatar.accent) } : null;
  });

  constructor() {
    effect(() => {
      const popkinId = this.popkinId();
      const photoId = this.photoId();
      untracked(() => {
        this.frame.open(popkinId);
        this.store.open(popkinId, photoId);
        this.album.seen(photoId);
      });
    });
    // L2-051: a photo that is not in the Popkin, or a Popkin the person is not in, is not found.
    effect(() => {
      if (this.store.state() === 'not-found') untracked(() => this.errors.showNotFound());
    });
  }

  /** L2-033 AC3. Each photo replaces the last in the history, so Close passes them all. */
  protected go(side: 'previous' | 'next'): void {
    const photoId = this.store.neighbour(side);
    if (!photoId) return;
    void this.router.navigate(['/p', this.popkinId(), 'photos', photoId], { replaceUrl: true });
  }

  /** L2-033 AC2. */
  protected close(): void {
    if (this.cameFromTheApp) this.location.back();
    else void this.router.navigate(['/p', this.popkinId(), 'photos'], { replaceUrl: true });
  }
}
