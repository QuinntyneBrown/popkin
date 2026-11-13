import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar, PersonAvatar } from '../avatar/avatar';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { Skeleton } from '../skeleton/skeleton';

/** One reaction of a photo, as a count: display only. */
export interface ViewerReaction {
  emoji: string;
  count: number;
  /** The reaction in words: "Heart, 10, you reacted". */
  label: string;
  /** The person looking has given it. */
  mine?: boolean;
}

/** A swipe is at least this far across, and more across than down. */
const SWIPE_DISTANCE = 48;

/**
 * Photo viewer (docs/design-system/components/photo-viewer.html): one photo full screen, on the
 * stage that is dark in both themes. It is the whole screen: a bar with Close, who added the
 * photo and when; the photo, whole, never cropped; and under it the caption (the screen's `h1`),
 * the reactions and the number of comments, as counts. From 768 px the caption keeps a readable
 * width; from 1024 px who, when, the caption and the counts are a panel beside the photo
 * (L2-058 AC11).
 *
 * A swipe across the photo asks for the `previous` or the `next` one; the arrow keys and Escape
 * are the page's. While `loading` the stage shows a spinner and says so; on `error` it says the
 * photo did not load and offers to try again, and has no panel.
 *
 * Slots: `[slot=actions]` is the end of the bar (Save photo); the default slot is the end of
 * the panel (comments, the react bar). Both are empty until a later journey fills them.
 */
@Component({
  selector: 'div[pk-photo-viewer]',
  imports: [Avatar, Button, Icon, IconButton, RouterLink, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-viewer.html',
  styleUrl: './photo-viewer.scss',
  host: {
    class: 'screen screen--stage',
    '[class.screen--viewer]': "state() !== 'error'",
    '[attr.data-accent]': 'accent()',
  },
})
export class PhotoViewer {
  /** The colour of the Popkin. */
  readonly accent = input<string>();
  readonly state = input<'ready' | 'loading' | 'error'>('ready');

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

  /** The reactions as counts. */
  readonly reactions = input<readonly ViewerReaction[]>([]);
  /** The number of comments, in words: "3 comments". None without it. */
  readonly comments = input<string>();

  /** In the bar, in place of the name, while the photo loads. */
  readonly loadingTitle = input('Loading…');
  /** What the status line says while the photo loads. */
  readonly loadingText = input('Loading photo…');
  readonly errorHeading = input('This photo didn’t load');
  readonly errorText = input('Check your connection and try again.');
  readonly retryLabel = input('Try again');

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

  private start: { x: number; y: number } | null = null;

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
