import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { Switch } from '../switch/switch';

/** One kind of notification as a row: its name, what sends it, and whether each channel is on. */
export interface NotifRow {
  key: string;
  name: string;
  about: string;
  email: boolean;
  phone: boolean;
  /** Always sent: "Always on" with a lock in place of the switches (L2-157 AC2). */
  required: boolean;
  emailDisabled?: boolean;
  phoneDisabled?: boolean;
}

export interface NotifSwitch {
  key: string;
  channel: 'email' | 'phone';
  on: boolean;
}

/**
 * Notification matrix (docs/design-system/components/notification-matrix.html, `notif-matrix`):
 * the kinds of one `pk-notif-group`, each with an email switch and a phone switch named
 * "{kind} by email" and "{kind} on your phone" (L2-157 AC1), or "Always on" with a lock. A switch
 * shows its thumb's place as well as its colour. Set `data-accent` on an ancestor.
 */
@Component({
  selector: 'ul[pk-notif-matrix]',
  imports: [Icon, Switch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notif-matrix.html',
  styleUrl: './notif-matrix.scss',
  host: { class: 'notif-matrix' },
})
export class NotifMatrix {
  readonly rows = input.required<readonly NotifRow[]>();
  readonly switched = output<NotifSwitch>();
}
