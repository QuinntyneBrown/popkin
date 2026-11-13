import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Alert (docs/design-system/components/alert.html): a failure that is not about one field, said
 * in plain words, announced when it appears. With an `action` it ends in a button that puts it
 * right, such as "Try again" under a section that did not load (L2-019 AC9). Its `icon` is the
 * alert's own unless the failure has one that says more, such as a camera that is off.
 */
@Component({
  selector: 'div[pk-alert]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
  host: {
    class: 'alert',
    '[class.alert--danger]': "variant() === 'danger'",
    '[class.alert--info]': "variant() === 'info'",
    '[class.alert--warning]': "variant() === 'warning'",
    role: 'alert',
  },
})
export class Alert {
  readonly heading = input.required<string>();
  readonly variant = input<'danger' | 'info' | 'warning'>('danger');
  /** Another icon than the alert's own: `scan` for a code that is not ours. */
  readonly icon = input<IconName>('alert');
  /** The words of the button under the text: "Try again". None without it. */
  readonly action = input<string>();
  /** The button was chosen. */
  readonly acted = output<void>();
}
