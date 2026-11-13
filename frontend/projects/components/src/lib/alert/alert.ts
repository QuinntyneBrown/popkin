import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Alert (docs/design-system/components/alert.html): a failure that is not about one field, said
 * in plain words, announced when it appears. With an `action` it ends in a button that puts it
 * right, such as "Try again" under a section that did not load (L2-019 AC9).
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
  /** The words of the button under the text: "Try again". None without it. */
  readonly action = input<string>();
  /** The button was chosen. */
  readonly acted = output<void>();
}
