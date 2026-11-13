import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * Your Popkins while it loads (docs/design-system/components/skeleton.html): sand cards of the
 * same size as Popkin cards and in the same columns, hidden from assistive technology, and a
 * status line that says what is loading (L2-017 AC7, L2-056 AC1). It sets its own distance from
 * the page's heading.
 */
@Component({
  selector: 'div[pk-popkin-skeleton]',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './popkin-skeleton.html',
  styleUrl: './popkin-skeleton.scss',
  host: { class: 'popkin-skeleton' },
})
export class PopkinSkeleton {
  /** What is loading, for assistive technology: "Loading your Popkins…". */
  readonly label = input.required<string>();
  /** How many cards to draw. */
  readonly count = input(3);

  protected readonly cards = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
