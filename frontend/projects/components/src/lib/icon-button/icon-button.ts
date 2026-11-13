import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Icon button (docs/design-system/components/icon-button.html): a 44 px round target whose
 * accessible name is its label, shown as a tooltip too.
 */
@Component({
  selector: 'a[pk-icon-button], button[pk-icon-button]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
  host: {
    class: 'icon-btn',
    '[attr.aria-label]': 'label()',
    '[attr.title]': 'label()',
  },
})
export class IconButton {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg' | 'base'>('base');
}
