import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TopBar } from '../top-bar/top-bar';

/**
 * List pane (docs/design-system/components/screen.html): from 1024 px, the list of threads
 * beside the thread that is open. Below that it is absent: the list is its own screen. It is a
 * child of the app screen, which gives it its place and width (`--pk-nav-width`,
 * `--pk-list-width`). Its rows go in the default slot; `[slot=action]` is the end of its head.
 */
@Component({
  selector: 'aside[pk-list-pane]',
  imports: [TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list-pane.html',
  styleUrl: './list-pane.scss',
  host: { class: 'list-pane', '[attr.aria-label]': 'label()' },
})
export class ListPane {
  /** The accessible name of the pane: "Chat". */
  readonly label = input.required<string>();
  /** Its visible heading. */
  readonly heading = input.required<string>();
}
