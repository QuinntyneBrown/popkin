import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Icon button (docs/design-system/components/icon-button.html): a 44 px round target whose
 * accessible name is its label, shown as a tooltip too. With `text` it is labelled
 * (`icon-btn--labelled`): from 640 px a short word shows beside the icon, as Invite does on a
 * call. The word is for the eye; the name stays the `label`, which begins with it.
 */
@Component({
  selector: 'a[pk-icon-button], button[pk-icon-button]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
  host: {
    class: 'icon-btn',
    '[class.icon-btn--card]': "variant() === 'card'",
    '[class.icon-btn--send]': "variant() === 'send'",
    '[class.icon-btn--labelled]': '!!text()',
    '[attr.aria-label]': 'label()',
    '[attr.title]': 'label()',
  },
})
export class IconButton {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  /**
   * `card` is a button on a tinted surface, such as the home header: a white disc with a shadow.
   * `send` is the coral button that sends a message.
   */
  readonly variant = input<'plain' | 'card' | 'send'>('plain');
  readonly size = input<'sm' | 'md' | 'lg' | 'base'>('base');
  /** The word shown beside the icon from 640 px: "Invite". */
  readonly text = input<string>();
}
