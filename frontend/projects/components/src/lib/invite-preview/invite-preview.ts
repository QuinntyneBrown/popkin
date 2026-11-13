import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { AvatarStack, StackAvatar } from '../avatar-stack/avatar-stack';
import { Pill } from '../pill/pill';
import { PopkinTile } from '../popkin-tile/popkin-tile';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The middle of an invite (docs/mocks/pages/join-invite): who invited you, the Popkin's tile
 * and name, its people, and one line under them, when it wraps up or that it has. It carries
 * the screen's `h1`. While `loading`, skeletons in the same shape stand in, hidden from
 * assistive technology, under a status line (L2-056 AC1).
 */
@Component({
  selector: 'div[pk-invite-preview]',
  imports: [Avatar, AvatarStack, Pill, PopkinTile, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invite-preview.html',
  styleUrl: './invite-preview.scss',
  host: { class: 'invite-preview' },
})
export class InvitePreview {
  /** Shows the skeleton and announces `loadingLabel`; the other inputs are not read. */
  readonly loading = input(false);
  readonly loadingLabel = input('Loading…');
  /** The first name of the person who invited, and their avatar. */
  readonly inviter = input<string>();
  readonly inviterAvatar = input<StackAvatar>();
  readonly emoji = input('');
  readonly name = input('');
  readonly avatars = input<readonly StackAvatar[]>([]);
  /** How many people the avatars leave out. */
  readonly more = input(0);
  /** The count in words: "14 people". */
  readonly people = input('');
  /** A wrapped-up Popkin: the tile is greyed and `note` says so. */
  readonly muted = input(false);
  /** A sentence under the people, in place of the projected time left. */
  readonly note = input<string>();
}
