import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Floating action (docs/design-system/components/button.html, `fab`): the main action of a tab
 * on a phone, in the Popkin's colour, above the tabs. Put it in the `[slot=fab]` of the app
 * screen, which hides it from 768 px, where the tab's header holds the same action. Its content
 * is the short word it shows ("Add"); `label` is its full accessible name ("Add photos") and
 * must contain that word. Set `data-accent` on an ancestor.
 */
@Component({
  selector: 'a[pk-fab], button[pk-fab]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fab.html',
  styleUrl: './fab.scss',
  host: { class: 'fab', '[attr.aria-label]': 'label() || null' },
})
export class Fab {
  readonly icon = input<IconName>('plus');
  /** The accessible name, when the word shown is too short to say what it does. */
  readonly label = input<string>();
}
