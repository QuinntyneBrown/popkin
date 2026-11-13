import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar, PersonAvatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';

/** One person on the call, as the pane lists them. */
export interface CallAsidePerson {
  /** What tells the person from the others: their member id. */
  id: string;
  /** Their name in full, the member's own ending "(you)". */
  name: string;
  avatar: PersonAvatar | null;
  microphone: 'speaking' | 'on' | 'muted';
}

/**
 * Call aside (docs/design-system/components/call-tile.html, `call-aside`): the pane at the end
 * of a call from 1280 px that lists who is on it, each with the state of their microphone as an
 * icon and in words (L2-058 AC12), and a line under the list. Below 1280 px it is absent, from
 * the tab order and from assistive technology too.
 */
@Component({
  selector: 'aside[pk-call-aside]',
  imports: [Avatar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './call-aside.html',
  styleUrl: './call-aside.scss',
  host: { class: 'call-aside', '[attr.aria-label]': 'label()' },
})
export class CallAside {
  /** The name of the pane. */
  readonly label = input('Who is on the call');
  readonly heading = input('On the call');
  readonly people = input.required<readonly CallAsidePerson[]>();
  /** Under the list: "8 others in Lakeside Weekend can join anytime." */
  readonly note = input<string>();

  /** The state of a microphone, in words. */
  readonly speakingLabel = input('Speaking');
  readonly onLabel = input('Microphone on');
  readonly mutedLabel = input('Muted');
}
