import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AvatarView } from '../../models/invite';
import { PhotoCommentView } from '../../models/photos';
import { messageTime } from '../chat/thread-text';
import { PHOTOS_API } from './photos-api';

/** The most a comment holds, and where the count starts to show (L2-035 AC3). */
export const COMMENT_MAX = 500;
const COUNT_FROM = 450;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 24 * 60 * 60 * 1000;

/** When a comment was added: "Sat 7:40" within the past week, then the date ("1 Sep"). */
export function commentTime(addedAt: Date, now: Date): string {
  const day = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (Math.round((day(now) - day(addedAt)) / DAY) < 7) {
    return `${WEEKDAYS[addedAt.getDay()]} ${messageTime(addedAt)}`;
  }
  return `${addedAt.getDate()} ${MONTHS[addedAt.getMonth()]}`;
}

/** A comment as the dialog and the side panel show it. */
export interface PhotoCommentRow {
  id: string;
  name: string;
  avatar: AvatarView;
  time: string;
  text: string;
  mine: boolean;
}

/**
 * A photo's comments (docs/detailed-designs/photos/comment-on-photo): read, added and deleted,
 * the same for the dialog below 1024 px and the photo view's side panel above it. One per photo
 * view, shared with its dialog.
 */
@Injectable()
export class PhotoCommentsStore {
  private readonly api = inject(PHOTOS_API);

  private popkinId = '';
  private photoId = '';
  private reading?: Subscription;
  private readonly said = signal<readonly PhotoCommentView[]>([]);
  private readonly opened = signal(0);
  private readonly loaded = signal(false);

  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly comments = computed<PhotoCommentRow[]>(() => {
    const now = new Date();
    return this.said().map((comment) => ({
      id: comment.id,
      name: comment.author.firstName,
      avatar: comment.author.avatar,
      time: commentTime(new Date(comment.addedAt), now),
      text: comment.text,
      mine: comment.mine,
    }));
  });
  /** How many there are: the photo's count until they answer. */
  readonly count = computed(() => (this.loaded() ? this.said().length : this.opened()));
  /** "3 comments", "1 comment", or "Comments" when there are none (L2-035 AC4). */
  readonly title = computed(() => {
    const count = this.count();
    if (count === 0) return 'Comments';
    return count === 1 ? '1 comment' : `${count} comments`;
  });

  /** The field, shared by the dialog and the panel. */
  readonly draft = signal('');
  readonly posting = signal(false);
  readonly canPost = computed(() => !this.posting() && this.draft().trim().length > 0);
  /** "450 / 500" once the field is near the limit (L2-035 AC3). */
  readonly countText = computed(() => {
    const length = this.draft().length;
    return length >= COUNT_FROM ? `${length} / ${COMMENT_MAX}` : null;
  });
  readonly postFailed = signal(false);
  /** The comment being deleted, and whether the last delete failed. */
  readonly deleting = signal<string | null>(null);
  readonly deleteFailed = signal(false);

  open(popkinId: string, photoId: string, count: number): void {
    this.popkinId = popkinId;
    this.photoId = photoId;
    this.opened.set(count);
    this.said.set([]);
    this.loaded.set(false);
    this.draft.set('');
    this.read();
  }

  retry(): void {
    this.read();
  }

  /** Posts the field and adds the comment at the end (L2-035 AC2); keeps the text on failure. */
  post(): void {
    const text = this.draft().trim();
    if (!this.canPost()) return;
    this.posting.set(true);
    this.postFailed.set(false);
    this.api.addComment(this.popkinId, this.photoId, text).subscribe({
      next: (comment) => {
        this.said.update((said) => [...said, comment]);
        this.draft.set('');
        this.posting.set(false);
      },
      error: () => {
        this.posting.set(false);
        this.postFailed.set(true);
      },
    });
  }

  /** Deletes the member's own comment, once they have confirmed (L2-035 AC5). */
  remove(commentId: string): void {
    this.deleting.set(commentId);
    this.deleteFailed.set(false);
    this.api.deleteComment(this.popkinId, this.photoId, commentId).subscribe({
      complete: () => {
        this.said.update((said) => said.filter((comment) => comment.id !== commentId));
        this.deleting.set(null);
      },
      error: () => {
        this.deleting.set(null);
        this.deleteFailed.set(true);
      },
    });
  }

  dismissFailure(): void {
    this.postFailed.set(false);
    this.deleteFailed.set(false);
  }

  private read(): void {
    this.reading?.unsubscribe();
    this.state.set('loading');
    this.reading = this.api.getComments(this.popkinId, this.photoId).subscribe({
      next: (comments) => {
        this.said.set(comments);
        this.loaded.set(true);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }
}
