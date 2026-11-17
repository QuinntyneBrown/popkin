import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let groups = 0;

/**
 * Notification group (docs/design-system/components/notification-matrix.html, `notif-group`): one
 * group of notification kinds, its title, what it is about and the column words "Email" and
 * "Phone" over the switches of its `pk-notif-matrix`. The column words are hidden from assistive
 * technology, since each switch carries its own name (L2-157 AC1).
 */
@Component({
  selector: 'section[pk-notif-group]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notif-group.html',
  styleUrl: './notif-group.scss',
  host: { class: 'notif-group', '[attr.aria-labelledby]': 'id' },
})
export class NotifGroup {
  readonly heading = input.required<string>();
  readonly about = input<string>();

  protected readonly id = `pk-notif-group-${++groups}`;
}
