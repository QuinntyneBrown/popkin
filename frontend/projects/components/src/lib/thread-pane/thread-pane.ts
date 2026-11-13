import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';

/**
 * Thread pane (docs/design-system/components/panes.html, `thread-pane`): from 1024 px, the
 * thread that is open beside the list of threads, where the list is the screen
 * (`pk-app-screen` with `layout="list"`, L2-058 AC11). Below that it is absent: the thread is a
 * screen of its own. It is a child of the app screen, which gives it its place
 * (`--pk-nav-width`, `--pk-list-width`).
 *
 * Its messages scroll inside it, between its head and its composer; a `pk-thread` in it scrolls
 * this pane, not the document.
 *
 * Slots: `[slot=header]` (a `div[pk-top-bar]` with `pane`), the default slot inside the
 * messages' part (a `pk-thread`, skeletons or an empty state) and `[slot=composer]`.
 */
@Component({
  selector: 'section[pk-thread-pane]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './thread-pane.html',
  styleUrl: './thread-pane.scss',
  host: { class: 'thread-pane', '[attr.aria-label]': 'label()' },
})
export class ThreadPane {
  /** The accessible name of the pane, the name of the thread: "Everyone". */
  readonly label = input.required<string>();
  /**
   * What the messages' part is: a `thread` of messages from the top, a thread whose content
   * sits at its end (`thread-end`, while it loads), or a `plain` body for an empty state or an
   * error.
   */
  readonly body = input<'thread' | 'thread-end' | 'plain'>('thread');
  /** The accessible name of the messages' part: "Messages" while it shows them. */
  readonly bodyLabel = input<string>();

  private readonly part = viewChild.required<ElementRef<HTMLElement>>('scroller');

  /** The part that scrolls: the messages. */
  get scroller(): HTMLElement {
    return this.part().nativeElement;
  }
}
