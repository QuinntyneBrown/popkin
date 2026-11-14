import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Stage message (docs/design-system/components/call-tile.html, `stage-message`): what the dark
 * stage says in place of its content, in its middle. While `busy` it has a spinner and is a
 * `status`: "Joining the call…". As an `alert` it says what went wrong, under an `icon`, and
 * offers the ways on. Under the member's own tile, alone on a call, it is "Waiting for the
 * others" and takes less room.
 *
 * Slots: the default slot is one action right under the text (Invite to call);
 * `[slot=actions]` is a row of actions set a little apart (Try again, Back to the Popkin).
 */
@Component({
  selector: 'div[pk-stage-message]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stage-message.html',
  styleUrl: './stage-message.scss',
  host: {
    class: 'stage-message',
    '[attr.role]': "alert() ? 'alert' : busy() ? 'status' : null",
  },
})
export class StageMessage {
  readonly heading = input.required<string>();
  readonly text = input<string>();
  /** Above the heading, where there is no spinner. */
  readonly icon = input<IconName>();
  /** Something is under way: a spinner shows, and the message is announced as a status. */
  readonly busy = input(false);
  /** Something went wrong: the message is announced at once. */
  readonly alert = input(false);
  /** Something changed that is worth hearing, politely: "This photo was removed". */
  readonly status = input(false);
}
