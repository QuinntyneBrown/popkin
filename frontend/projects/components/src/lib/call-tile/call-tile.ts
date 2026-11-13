import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Avatar, PersonAvatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';

/**
 * Call tile (docs/design-system/components/call-tile.html): one person on a call, in a
 * `ul[pk-call-grid]`. It shows what their camera sees, or their avatar when the camera is off
 * or nothing has arrived yet (L2-030 AC2); their first `name`, or "You"; a muted microphone
 * beside the name when they are `muted` (AC3); and a ring in the Popkin's colour while they are
 * `speaking` (AC4). Muted and speaking are said in words too, for assistive technology.
 *
 * The `stream` plays in a `<video>` without sound: what people say is played by the call itself,
 * which goes on while its screen is closed (L2-030 AC7).
 *
 * With `rest` the tile is no person: it counts the people on the call that are not shown
 * (L2-029 AC7), in the consumer's words, and takes no other input.
 */
@Component({
  selector: 'li[pk-call-tile]',
  imports: [Avatar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './call-tile.html',
  styleUrl: './call-tile.scss',
  host: {
    class: 'call-tile',
    '[class.call-tile--speaking]': 'speaking() && !rest()',
    '[class.call-tile--rest]': '!!rest()',
  },
})
export class CallTile {
  /** The person's first name, or "You" on the member's own tile. */
  readonly name = input('');
  /** Drawn when the camera is off, or while there is no stream. */
  readonly avatar = input<PersonAvatar | null>(null);
  /** What the person sends: their camera and their microphone. */
  readonly stream = input<MediaStream | null>(null);
  /** The camera is off: the avatar shows in place of the picture. */
  readonly cameraOff = input(false);
  readonly muted = input(false);
  readonly speaking = input(false);
  /** Before the name of someone muted, for assistive technology. */
  readonly mutedText = input('Muted, ');
  /** After the name of who is speaking, for assistive technology. */
  readonly speakingText = input(', speaking');
  /** The people not shown, counted: "3 more on the call". */
  readonly rest = input<string>();

  /** The picture to play: none while the camera is off. */
  protected readonly shown = computed(() => (this.cameraOff() ? null : this.stream()));
}
