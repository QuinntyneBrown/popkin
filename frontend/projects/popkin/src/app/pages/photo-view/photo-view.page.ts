import { Dialog } from '@angular/cdk/dialog';
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
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import {
  AlbumStore,
  ErrorScreens,
  PhotoCommentsStore,
  PhotoViewStore,
  PopkinFrame,
  QUICK_REACTIONS,
  accentOf,
  reactionName,
} from 'api';
import { PhotoViewer } from 'components';
import {
  DELETE_COMMENT,
  DeleteCommentData,
  DeleteCommentDialog,
} from '../../dialogs/delete-comment/delete-comment.dialog';
import { DeletePhotoData, DeletePhotoDialog } from '../../dialogs/delete-photo/delete-photo.dialog';
import {
  PhotoActionsData,
  PhotoActionsDialog,
} from '../../dialogs/photo-actions/photo-actions.dialog';
import {
  PhotoCommentsData,
  PhotoCommentsDialog,
} from '../../dialogs/photo-comments/photo-comments.dialog';
import {
  PhotoReactionsData,
  PhotoReactionsDialog,
} from '../../dialogs/photo-reactions/photo-reactions.dialog';
import { Toaster } from '../../toasts/toaster';

/**
 * One photo, full screen on a dark stage (L2-033): who added it and when, the whole photo and
 * its caption. The arrow keys and a swipe open the photos either side; Close and Escape return
 * to the screen the member came from. The member reacts, reads and adds comments (the side panel
 * from 1024 px, the Photo comments dialog below it), saves the photo and, when theirs to delete,
 * deletes it (L2-034 to L2-036). A wrapped-up Popkin shows all of it read-only (L2-045).
 */
/** Named by its title, and modal, as the app's other dialogs are. */
const MODAL = { ariaLabelledBy: 'dlg-title', hasBackdrop: false, ariaModal: true } as const;

@Component({
  selector: 'pk-photo-view-page',
  imports: [PhotoViewer],
  providers: [PhotoViewStore, PhotoCommentsStore],
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
  protected readonly comments = inject(PhotoCommentsStore);
  private readonly dialog = inject(Dialog);
  private readonly toaster = inject(Toaster);
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
    return state === 'not-found' ? 'loading' : state;
  });
  protected readonly readOnly = this.frame.wrappedUp;
  protected readonly quick = computed(() => (this.readOnly() ? [] : QUICK_REACTIONS));
  protected readonly reactions = computed(() =>
    this.store.reactions().map((reaction) => ({ ...reaction, name: reactionName(reaction.emoji) })),
  );
  protected readonly commentList = computed(() =>
    this.comments.comments().map((said) => ({
      ...said,
      avatar: { ...said.avatar, accent: accentOf(said.avatar.accent) },
    })),
  );
  /** "3 comments" under the photo; nothing while there are none. */
  protected readonly commentCount = computed(() =>
    this.comments.count() > 0 ? this.comments.title() : undefined,
  );
  protected readonly canDelete = computed(() => !!this.photo()?.canDelete && !this.readOnly());
  protected readonly back = computed(() => ['/p', this.popkinId(), 'photos']);
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
    // The comments of the photo shown, counted by the photo until they answer (L2-035).
    let commentsOf = '';
    effect(() => {
      const photo = this.photo();
      if (!photo || photo.id === commentsOf) return;
      commentsOf = photo.id;
      untracked(() => this.comments.open(this.popkinId(), photo.id, photo.commentCount));
    });
    // A failure stays until dismissed and says what went back to how it was (L2-056 AC7).
    this.failure(this.store.reactionFailed, () => {
      this.store.dismissReactionFailure();
      this.toaster.show('danger', 'We couldn’t save your reaction.');
    });
    this.failure(this.store.saveFailed, () => {
      this.store.dismissSaveFailure();
      this.toaster.show('danger', 'We couldn’t save this photo.', 'Try again in a moment.');
    });
    this.failure(this.comments.postFailed, () => {
      this.comments.dismissFailure();
      this.toaster.show('danger', 'We couldn’t post your comment.', 'It’s still in the field.');
    });
    this.failure(this.comments.deleteFailed, () => {
      this.comments.dismissFailure();
      this.toaster.show('danger', 'We couldn’t delete your comment.', 'It’s still here.');
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

  /** "More reactions" (L2-034 AC1): the emoji chosen is toggled as a quick one is. */
  protected async moreReactions(): Promise<void> {
    const ref = this.dialog.open<string, PhotoReactionsData>(PhotoReactionsDialog, {
      ...MODAL,
      data: {
        accent: this.frame.accent(),
        pressed: this.store
          .reactions()
          .filter((r) => r.mine)
          .map((r) => r.emoji),
      },
    });
    const emoji = await firstValueFrom(ref.closed);
    if (emoji) this.store.react(emoji);
  }

  /** Below 1024 px, "Comment" and the count open the Photo comments dialog (L2-035 AC1). */
  protected openComments(): void {
    this.dialog.open<void, PhotoCommentsData>(PhotoCommentsDialog, {
      ...MODAL,
      data: { accent: this.frame.accent(), store: this.comments, readOnly: this.readOnly() },
    });
  }

  /** The side panel's field posts as the dialog's does (L2-035 AC2). */
  protected postComment(): void {
    this.comments.post();
  }

  /** L2-035 AC5: gone once the member has confirmed. */
  protected async deleteComment(commentId: string): Promise<void> {
    const ref = this.dialog.open<boolean, DeleteCommentData>(DeleteCommentDialog, {
      ...DELETE_COMMENT,
      data: { accent: this.frame.accent() },
    });
    if (await firstValueFrom(ref.closed)) this.comments.remove(commentId);
  }

  /** L2-036 AC2: Photo actions, then "Delete this photo?"; once gone, back where it was listed. */
  protected async actions(): Promise<void> {
    const accent = this.frame.accent();
    const chosen = this.dialog.open<boolean, PhotoActionsData>(PhotoActionsDialog, {
      ...MODAL,
      data: { accent },
    });
    if (!(await firstValueFrom(chosen.closed))) return;
    const asked = this.dialog.open<boolean, DeletePhotoData>(DeletePhotoDialog, {
      ...MODAL,
      data: { accent, store: this.store },
    });
    if (!(await firstValueFrom(asked.closed))) return;
    this.toaster.show('success', 'Photo deleted.');
    if (this.cameFromTheApp) this.location.back();
    else void this.router.navigate(['/p', this.popkinId(), 'photos'], { replaceUrl: true });
  }

  private failure(failed: () => boolean, tell: () => void): void {
    effect(() => {
      if (failed()) untracked(tell);
    });
  }
}
