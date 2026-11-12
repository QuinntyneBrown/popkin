import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Alert (docs/design-system/components/alert.html): a failure that is not about one field, said
 * in plain words, announced when it appears.
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
}
