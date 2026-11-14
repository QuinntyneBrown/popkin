import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar, PersonAvatar } from '../avatar/avatar';
import { Button } from '../button/button';
import { Comment } from '../comment/comment';
import { Composer } from '../composer/composer';
import { IconButton } from '../icon-button/icon-button';
import { ReactBar } from '../react-bar/react-bar';
import { ReactionOption } from '../reaction-grid/reaction-grid';
import { Skeleton } from '../skeleton/skeleton';
import { StageButton } from '../stage-button/stage-button';
import { StageMessage } from '../stage-message/stage-message';

/** One reaction of a photo, as a count (L2-034 AC2). */
export interface ViewerReaction {
  emoji: string;
  count: number;
  /** The emoji's name: "Heart". The chip is named "Heart, 10", and ", you reacted" if `mine`. */
  name?: string;
  /** The reaction in words, where the consumer words it itself: "Heart, 10, you reacted". */
  label?: string;
  /** The person looking has given it: the chip is filled white. */
  mine?: boolean;
}

/** One comment on a photo, as the side panel lists it (L2-035). */
export interface ViewerComment {
  id: string;
  /** The member's first name. */
  name: string;
  avatar: PersonAvatar | null;
  /** When it was said, in words: "Sat 7:40". */
  time: string;
  text: string;
  /** The person looking wrote it: it offers "Delete comment". */
  mine: boolean;
}

/** A swipe is at least this far across, and more across than down. */
const SWIPE_DISTANCE = 48;

/**
 * Photo viewer (docs/design-system/components/photo-viewer.html): one photo full screen, on the
 * stage that is dark in both themes. It is the whole screen: a bar with Close, who added the
 * photo and when, "Save photo" and, for whoever may delete it (`canDelete`), "Photo actions";
 * the photo, whole, never cropped; and under it the caption (the screen's `h1`), the reactions
 * as counts, the number of comments, the react bar and "Comment". From 768 px the caption keeps
 * a readable width; from 1024 px who, when, the caption and the counts are a panel beside the
 * photo, which lists the comments too and ends with the field "Add a comment" (L2-058 AC11).
 *
 * The react bar is `quickReactions` as toggle buttons ("React heart"), pressed where the person
 * looking has reacted with it; each choice is a `react`, and "More reactions" a
 * `moreReactions`, for the consumer to apply (L2-034). "Comment" and the count of comments
 * emit `openComments` below 1024 px; from 1024 px, where the panel has the field, they move the
 * focus to it instead. The field posts its trimmed text as `postComment`, and the consumer
 * empties `commentDraft` once the comment is taken; while `posting` the text stays, read-only,
 * and "Post comment" is busy. A comment of one's own offers "Delete comment", `deleteComment`
 * with its id. "Save photo" emits `save` and is disabled and busy while `saving`; "Photo
 * actions" emits `actions` (L2-036).
 *
 * `readOnly` is a wrapped-up Popkin: the reactions and comments show, but there is no react
 * bar, no Comment, no field, no Delete comment and no Photo actions (L2-045).
 *
 * A swipe across the photo asks for the `previous` or the `next` one; the arrow keys and Escape
 * are the page's. While `loading` the stage shows a spinner and says so; on `error` it says the
 * photo did not load and offers to try again, and has no panel. `removed` is a photo deleted
 * while it was open: the bar keeps only Close, and the stage says so with a link `back` to
 * where it was listed.
 */
@Component({
  selector: 'div[pk-photo-viewer]',
  imports: [
    Avatar,
    Button,
    Comment,
    Composer,
    IconButton,
    ReactBar,
    RouterLink,
    Skeleton,
    StageButton,
    StageMessage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-viewer.html',
  styleUrl: './photo-viewer.scss',
  host: {
    class: 'screen screen--stage',
    '[class.screen--viewer]': "state() === 'ready' || state() === 'loading'",
    '[attr.data-accent]': 'accent()',
  },
})
export class PhotoViewer {
  /** The colour of the Popkin. */
  readonly accent = input<string>();
  readonly state = input<'ready' | 'loading' | 'error' | 'removed'>('ready');

  /** The route Close leads to. Without it Close is a button, and `closed` says it was chosen. */
  readonly close = input<string | readonly unknown[]>();
  readonly closeLabel = input('Close');

  /** Who added the photo. */
  readonly name = input('');
  readonly avatar = input<PersonAvatar | null>(null);
  /** When it was added, in words: "Saturday, 7:02 am". */
  readonly time = input('');

  readonly src = input('');
  /** What the photo shows: its caption, or who added it and when. */
  readonly alt = input('');
  /** The photo's size in pixels; its place is kept before it arrives. */
  readonly width = input<number>();
  readonly height = input<number>();
  /** The caption, the screen's `h1`. A photo without one has the hidden `heading` instead. */
  readonly caption = input('');
  /** The screen's `h1` where there is no caption to be it; visually hidden. */
  readonly heading = input('Photo');
  /** A line under the caption: "Only you two can see this", for a direct message's photo. */
  readonly note = input<string>();

  /** The reactions as counts, in the order they were first given. */
  readonly reactions = input<readonly ViewerReaction[]>([]);
  /** The number of comments, in words: "3 comments". None without it. */
  readonly comments = input<string>();
  /** The comments, oldest first, listed in the side panel from 1024 px. */
  readonly commentList = input<readonly ViewerComment[]>([]);
  /** The emoji of the react bar, with their names: the quick five of L2-034. None without. */
  readonly quickReactions = input<readonly ReactionOption[]>([]);
  /** A wrapped-up Popkin: nothing can be reacted, commented, deleted or taken back. */
  readonly readOnly = input(false);
  /** The person looking may delete the photo: "Photo actions" shows. */
  readonly canDelete = input(false);
  /** "Save photo" is under way. */
  readonly saving = input(false);
  /** What is written in the panel's field "Add a comment". */
  readonly commentDraft = model('');
  /** A comment is being posted. */
  readonly posting = input(false);

  /** In the bar, in place of the name, while the photo loads. */
  readonly loadingTitle = input('Loading…');
  /** What the status line says while the photo loads. */
  readonly loadingText = input('Loading photo…');
  readonly errorHeading = input('This photo didn’t load');
  readonly errorText = input('Check your connection and try again.');
  readonly retryLabel = input('Try again');
  readonly removedHeading = input('This photo was removed');
  readonly removedText = input('It’s no longer in Photos.');
  /** Where the link of a removed photo leads: the album, or the direct message. */
  readonly back = input<string | readonly unknown[]>();
  readonly backLabel = input('Back to Photos');

  /** Close was chosen, where it is a button. */
  readonly closed = output<void>();
  /** A swipe towards the end: the photo before this one is asked for. */
  readonly previous = output<void>();
  /** A swipe towards the start: the photo after this one is asked for. */
  readonly next = output<void>();
  /** The browser could not show the photo. */
  readonly imageError = output<void>();
  /** Try again was chosen. */
  readonly retried = output<void>();
  /** An emoji of the react bar: the reaction of the person looking to toggle. */
  readonly react = output<string>();
  /** "More reactions": the emoji picker. */
  readonly moreReactions = output<void>();
  /** "Comment" or the count of comments, below 1024 px: the comments dialog. */
  readonly openComments = output<void>();
  /** The trimmed text of the panel's field. */
  readonly postComment = output<string>();
  /** "Delete comment" on a comment of one's own: its id. */
  readonly deleteComment = output<string>();
  /** "Save photo". */
  readonly save = output<void>();
  /** "Photo actions": the menu with "Delete photo". */
  readonly actions = output<void>();

  private readonly composer = viewChild(Composer);
  private readonly composerBox = viewChild<ElementRef<HTMLElement>>('composerBox');

  /** The emoji the person looking has reacted with. */
  protected readonly pressedEmoji = computed(() =>
    this.reactions()
      .filter((reaction) => reaction.mine)
      .map((reaction) => reaction.emoji),
  );

  protected readonly chips = computed(() =>
    this.reactions().map((reaction) => ({
      ...reaction,
      label:
        reaction.label ??
        `${reaction.name ?? reaction.emoji}, ${reaction.count}${reaction.mine ? ', you reacted' : ''}`,
    })),
  );

  private start: { x: number; y: number } | null = null;

  /** Moves the focus to the side panel's field, where it shows; false where it does not. */
  focusCommentField(): boolean {
    const box = this.composerBox()?.nativeElement;
    if (!box || getComputedStyle(box).display === 'none') return false;
    this.composer()?.focus();
    return true;
  }

  /** "Comment" and the count: the field beside the photo where there is one, else the dialog. */
  protected comment(): void {
    if (!this.focusCommentField()) this.openComments.emit();
  }

  protected pressed(event: PointerEvent): void {
    // A second finger is a pinch, not a swipe.
    this.start = event.isPrimary ? { x: event.clientX, y: event.clientY } : null;
  }

  protected released(event: PointerEvent): void {
    const start = this.start;
    this.start = null;
    if (!start || !event.isPrimary) return;
    const across = event.clientX - start.x;
    const down = event.clientY - start.y;
    if (Math.abs(across) < SWIPE_DISTANCE || Math.abs(across) < Math.abs(down) * 1.5) return;
    if (across < 0) this.next.emit();
    else this.previous.emit();
  }

  protected cancelled(): void {
    this.start = null;
  }
}
