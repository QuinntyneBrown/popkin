import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A screen inside a Popkin (docs/design-system/components/screen.html, `screen--app`): its
 * header, an optional banner, the `main` landmark, and the Popkin navigation, which is the tabs
 * along the bottom on a phone, a rail from 768 px and a sidebar from 1024 px (L2-058 AC8). The
 * document scrolls; nothing inside the screen does.
 *
 * As a `thread` (`screen--thread`) it also has the sticky composer, the list of threads, which
 * opens beside the thread from 1024 px, and the detail pane, which opens from 1280 px. As a
 * `tab`, such as the Popkin home, the screen is the tab's alone: nothing opens beside it. As a
 * `list` (`screen--list`), the list of threads is the screen itself; from 1024 px it keeps to the
 * list's column and the thread pane (`pk-thread-pane`) fills the rest (L2-058 AC11).
 *
 * It makes the room for the three fixed parts and tells them their widths through
 * `--pk-nav-width`, `--pk-list-width` and `--pk-detail-width`.
 *
 * Slots: `[slot=header]`, `[slot=banner]`, the default slot inside `main`, `[slot=fab]` (the
 * floating action of a phone, a `pk-fab`; absent from 768 px, where the header holds the action,
 * L2-058 AC9), `[slot=composer]`, `[slot=nav]`, `[slot=list]`, `[slot=thread]` (the thread pane of a `list`)
 * and `[slot=detail]`.
 */
@Component({
  selector: 'div[pk-app-screen]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-screen.html',
  styleUrl: './app-screen.scss',
  host: {
    class: 'screen screen--app',
    '[class.screen--thread]': "layout() === 'thread'",
    '[class.screen--list]': "layout() === 'list'",
    '[attr.data-accent]': 'accent()',
  },
})
export class AppScreen {
  /** The colour of the Popkin. */
  readonly accent = input.required<string>();
  /**
   * `thread` leaves room for the list of threads and the detail pane beside it; `tab` is one of
   * the Popkin's four places and has the navigation alone at its side; `list` is the list of
   * threads, with the thread pane beside it from 1024 px.
   */
  readonly layout = input<'thread' | 'tab' | 'list'>('thread');
  /**
   * What `main` is: a `thread` of messages from the top, a thread whose content sits at its end
   * (`thread-end`, while it loads), a `plain` body for an empty state or an error, or a `flush`
   * body whose content reaches the sides and the header above it, as the Popkin home does.
   */
  readonly body = input<'thread' | 'thread-end' | 'plain' | 'flush'>('thread');
  /** The accessible name of `main`: "Messages" while it shows them. */
  readonly mainLabel = input<string>();
}
