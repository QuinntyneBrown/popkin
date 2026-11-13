import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The screen of a thread inside a Popkin (docs/design-system/components/screen.html,
 * `screen--app screen--thread`): the sticky top bar, an optional banner, the `main` landmark,
 * the sticky composer, and around them the Popkin navigation, the list of threads and the
 * detail pane. On a phone it is the thread alone; the navigation is a rail from 768 px and a
 * sidebar from 1024 px, where the list opens beside the thread, and the detail pane opens from
 * 1280 px (L2-058 AC8). The document scrolls; nothing inside the screen does.
 *
 * It makes the room for the three fixed parts and tells them their widths through
 * `--pk-nav-width`, `--pk-list-width` and `--pk-detail-width`.
 *
 * Slots: `[slot=header]`, `[slot=banner]`, the default slot inside `main`, `[slot=composer]`,
 * `[slot=nav]`, `[slot=list]` and `[slot=detail]`.
 */
@Component({
  selector: 'div[pk-app-screen]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-screen.html',
  styleUrl: './app-screen.scss',
  host: {
    class: 'screen screen--app screen--thread',
    '[attr.data-accent]': 'accent()',
  },
})
export class AppScreen {
  /** The colour of the Popkin. */
  readonly accent = input.required<string>();
  /**
   * What `main` is: a `thread` of messages from the top, a thread whose content sits at its end
   * (`thread-end`, while it loads), or a `plain` body for an empty state or an error.
   */
  readonly body = input<'thread' | 'thread-end' | 'plain'>('thread');
  /** The accessible name of `main`: "Messages" while it shows them. */
  readonly mainLabel = input<string>();
}
