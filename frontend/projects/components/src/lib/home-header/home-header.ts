import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from '../avatar/avatar';
import { AvatarStack, StackAvatar } from '../avatar-stack/avatar-stack';
import { IconButton } from '../icon-button/icon-button';
import { PopkinTile } from '../popkin-tile/popkin-tile';
import { Skeleton } from '../skeleton/skeleton';
import { TimeLeft } from '../time-left/time-left';

/**
 * Home header (docs/design-system/components/home-header.html): the head of the Popkin home, on
 * a wash of the Popkin's colour. It names the Popkin (its tile and its name, the screen's `h1`),
 * shows a few of its people and how many there are, says how long it has, and holds the actions
 * of the Popkin. On a phone a bar above it leads back and the actions are two equal buttons
 * under the name; from 768 px the bar is gone (the navigation leads back) and the actions sit in
 * a row; from 1024 px they sit beside the name (L2-058 AC11). Set `data-accent` on an ancestor.
 *
 * While `loading` it draws its own skeleton, with the screen's `h1` and a status line for
 * assistive technology (L2-056 AC1).
 *
 * Slot: `[slot=actions]`, the buttons: Group call and Invite.
 */
@Component({
  selector: 'header[pk-home-header]',
  imports: [Avatar, AvatarStack, IconButton, PopkinTile, RouterLink, Skeleton, TimeLeft],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-header.html',
  styleUrl: './home-header.scss',
  host: { class: 'home-header' },
})
export class HomeHeader {
  /** The route the bar's Back leads to, on a phone. */
  readonly back = input.required<string>();
  /** Where Back leads, in words. */
  readonly backLabel = input('My Popkins');
  readonly name = input('');
  readonly emoji = input('');
  /** Up to four of the Popkin's people. One person alone shows as a single avatar. */
  readonly avatars = input<readonly StackAvatar[]>([]);
  /** How many people the avatars leave out; 0 shows no "+N". */
  readonly more = input(0);
  /** How many people there are, in words: "14 members", "1 member". */
  readonly members = input('');
  /** How long the Popkin has, in words: "1 day 6 hrs left · Wraps up Sun, 6 pm". None when null. */
  readonly timeLeft = input<string | null>(null);
  /**
   * The name of the button that opens the Popkin's settings: "Popkin settings". Without it the
   * button is absent, both in the bar and beside the actions.
   */
  readonly settings = input<string>();
  /** The skeleton of the header, in place of the Popkin. */
  readonly loading = input(false);
  /** The screen's `h1` while the name is not known yet; visually hidden. */
  readonly loadingHeading = input('Popkin home');
  /** What the status line says while it loads. */
  readonly loadingText = input('Loading this Popkin…');

  /** The settings button was chosen. */
  readonly settingsOpened = output<void>();
}
