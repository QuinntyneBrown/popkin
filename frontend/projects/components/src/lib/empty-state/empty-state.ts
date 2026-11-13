import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { Mark } from '../mark/mark';
import { PopkinTile } from '../popkin-tile/popkin-tile';

/**
 * Empty state (docs/design-system/components/empty-state.html): an icon or a Popkin's tile, a
 * heading, a line of text and the actions that move on. Also the not-found, error and offline
 * screens. `compact` is the empty state of one section of a screen, inside a card.
 */
@Component({
  selector: 'div[pk-empty-state]',
  imports: [Icon, Mark, PopkinTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  host: {
    class: 'empty',
    '[class.empty--compact]': 'compact()',
    '[attr.role]': "alert() ? 'alert' : null",
  },
})
export class EmptyState {
  readonly icon = input<IconName>();
  /** The emoji of a Popkin, on its tile, in place of the icon: an empty thread. */
  readonly tile = input<string>();
  /** The Popkin mark in place of the icon: a person with no Popkins yet. */
  readonly mark = input(false);
  readonly heading = input.required<string>();
  /** `1` when the state is the whole screen, `3` under a section's `h2`, else `2`. */
  readonly level = input<1 | 2 | 3>(2);
  /** The empty state of one section, inside a card: less room, a smaller heading and tile. */
  readonly compact = input(false);
  readonly text = input<string>();
  /** Announces the state when it replaces content that failed to load (L2-056 AC2). */
  readonly alert = input(false);
  /** A reference code shown under the actions, as the server-error screen does. */
  readonly code = input<string>();

  private readonly screenHeading = viewChild<ElementRef<HTMLElement>>('screenHeading');

  /** Moves the focus to the heading of a whole-screen state, when an action left it as it was. */
  focusHeading(): void {
    this.screenHeading()?.nativeElement.focus();
  }
}
