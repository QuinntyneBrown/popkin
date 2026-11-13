import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Empty state (docs/design-system/components/empty-state.html): an icon, a heading, a line of
 * text and the actions that move on. Also the not-found, error and offline screens.
 */
@Component({
  selector: 'div[pk-empty-state]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  host: { class: 'empty', '[attr.role]': "alert() ? 'alert' : null" },
})
export class EmptyState {
  readonly icon = input.required<IconName>();
  readonly heading = input.required<string>();
  /** `1` when the state is the whole screen, else `2`. */
  readonly level = input<1 | 2>(2);
  readonly text = input<string>();
  /** Announces the state when it replaces content that failed to load (L2-056 AC2). */
  readonly alert = input(false);
  /** A reference code shown under the actions, as the server-error screen does. */
  readonly code = input<string>();
}
