import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The body of the Experiences tab, inside a `flush` body of the app screen. It holds the grid
 * of experience cards, or the empty state that stands in for it, and leaves room at its end for
 * the floating action and the tabs.
 *
 * While `loading` it draws its own skeleton, two cards, with a status line for assistive
 * technology (L2-056 AC1).
 *
 * Slot: the default slot holds a `ul[pk-experience-grid]` or a `pk-empty-state`.
 */
@Component({
  selector: 'div[pk-experiences]',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experiences.html',
  styleUrl: './experiences.scss',
  host: { class: 'experiences' },
})
export class Experiences {
  /** The skeleton of the cards, in place of the grid. */
  readonly loading = input(false);
  /** What the status line says while it loads. */
  readonly loadingText = input('Loading experiences…');

  protected readonly cards = [0, 1];
}
