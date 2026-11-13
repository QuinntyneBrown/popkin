import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

/** How far above the screen the top of the thread is when earlier messages are asked for. */
const AHEAD = '240px 0px 0px 0px';

/**
 * Thread (docs/design-system/components/message.html): the rows of a thread, in a column, inside
 * the `main` of the app screen. It owns how the thread scrolls, which is the document scrolling
 * under the sticky top bar and composer:
 *
 * - `reachedTop` fires when the top of the thread comes near the screen: load earlier messages;
 * - `keepPlace` adds them without the view jumping (L2-027 AC5);
 * - `latestInView` says whether the end of the thread is on screen, and `scrollToLatest` goes
 *   there;
 * - `newMessages` shows the "New messages" control above the composer, and `jump` is its choice;
 * - `announcement` is read out politely (L2-027 AC6).
 */
@Component({
  selector: 'div[pk-thread]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './thread.html',
  styleUrl: './thread.scss',
  host: { class: 'thread__rows' },
})
export class Thread {
  /** Messages arrived below while the end of the thread was out of view. */
  readonly newMessages = input(false);
  /** A line for assistive technology: who wrote, and what. Change it to have it read. */
  readonly announcement = input('');

  /** The top of the thread is near the screen. Fires again after `keepPlace` if it still is. */
  readonly reachedTop = output<void>();
  /** Whether the end of the thread is on screen. */
  readonly latestInView = output<boolean>();
  /** The "New messages" control was chosen. */
  readonly jump = output<void>();

  private readonly top = viewChild.required<ElementRef<HTMLElement>>('top');
  private readonly bottom = viewChild.required<ElementRef<HTMLElement>>('bottom');
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private topObserver?: IntersectionObserver;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.topObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) this.reachedTop.emit();
        },
        { rootMargin: AHEAD },
      );
      this.topObserver.observe(this.top().nativeElement);

      const bottomObserver = new IntersectionObserver((entries) => {
        this.latestInView.emit(entries[entries.length - 1].isIntersecting);
      });
      bottomObserver.observe(this.bottom().nativeElement);

      destroyRef.onDestroy(() => {
        this.topObserver?.disconnect();
        bottomObserver.disconnect();
      });
    });
  }

  /** Scrolls the document to the end of the thread: at once by default, or `smooth`. */
  scrollToLatest(behaviour: ScrollBehavior = 'instant'): void {
    const scroller = this.document.scrollingElement;
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior: behaviour });
  }

  /**
   * Runs a change that adds rows above the ones on screen, and keeps those where they are: the
   * distance from the end of the document is the same after the rows are drawn as before.
   */
  keepPlace(change: () => void): void {
    const scroller = this.document.scrollingElement;
    const fromEnd = scroller ? scroller.scrollHeight - scroller.scrollTop : 0;
    change();
    afterNextRender(
      () => {
        scroller?.scrollTo({ top: scroller.scrollHeight - fromEnd, behavior: 'instant' });
        // Observing again reports the top once more if it is still near the screen.
        const top = this.top().nativeElement;
        this.topObserver?.unobserve(top);
        this.topObserver?.observe(top);
      },
      { injector: this.injector },
    );
  }
}
