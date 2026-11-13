import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Avatar, PersonAvatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';
import { Skeleton, SkeletonWidth } from '../skeleton/skeleton';

/**
 * How far a message of mine has got: `sending` is on its way, `waiting` is kept until the
 * connection is back, `failed` was not sent and can be tried again or deleted.
 */
export type MessageState = 'sent' | 'sending' | 'waiting' | 'failed';

/**
 * Message (docs/design-system/components/message.html): one bubble. Theirs is on white beside
 * the sender's avatar, under their first name; mine is on the Popkin colour at the end of the
 * row, with its time. In a run of messages from one person only the first is the `lead` that
 * shows the name and the avatar (L2-021 AC2); the others keep the name for assistive technology.
 * The text is shown as text, with its line breaks (L2-052).
 *
 * With `skeleton` it is the shape of a message that is loading and reads no other input but
 * `mine` and `width`.
 */
@Component({
  selector: 'div[pk-message]',
  imports: [Avatar, Icon, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message.html',
  styleUrl: './message.scss',
  host: {
    class: 'msg',
    '[class.msg--mine]': 'mine()',
    '[attr.data-state]': 'skeleton() ? null : state()',
  },
})
export class Message {
  readonly mine = input(false);
  /** The sender's first name. */
  readonly name = input('');
  readonly avatar = input<PersonAvatar>();
  /** The first message of a run: it shows the name and the avatar. */
  readonly lead = input(true);
  readonly text = input('');
  /** The time it was sent, in words, shown under my own messages. */
  readonly time = input('');
  readonly state = input<MessageState>('sent');
  /** Draws the loading shape instead of a message. */
  readonly skeleton = input(false);
  /** The width of the loading bubble, in percent of the row. */
  readonly width = input<SkeletonWidth>(60);

  /** "Try again" on a message that was not sent. */
  readonly retry = output<void>();
  /** "Delete" on a message that was not sent. */
  readonly discard = output<void>();
}
