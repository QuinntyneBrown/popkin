import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Skeleton (docs/design-system/components/skeleton.html): a sand shape in the place of content
 * that is loading, with a slow shimmer that stops under reduced motion. Put the shapes in a
 * container with `aria-hidden="true"` beside a status line that says what is loading
 * (L2-056 AC1).
 */
@Component({
  selector: 'span[pk-skeleton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.scss',
  host: {
    class: 'skeleton',
    '[class.skeleton--text]': "shape() === 'text'",
    '[class.skeleton--title]': "shape() === 'title'",
    '[class.skeleton--circle]': "shape() === 'circle'",
    '[class.skeleton--tile]': "shape() === 'tile'",
    '[class.skeleton--tile-2xl]': "shape() === 'tile-2xl'",
    '[class.skeleton--card]': "shape() === 'card'",
    '[class.skeleton--btn]': "shape() === 'btn'",
    '[class.skeleton--pill]': "shape() === 'pill'",
    '[class.skeleton--bubble]': "shape() === 'bubble'",
    '[class.thumb]': "shape() === 'thumb'",
    '[class.w-20]': 'width() === 20',
    '[class.w-30]': 'width() === 30',
    '[class.w-40]': 'width() === 40',
    '[class.w-50]': 'width() === 50',
    '[class.w-60]': 'width() === 60',
    '[class.w-70]': 'width() === 70',
    '[class.w-80]': 'width() === 80',
    '[class.w-full]': "width() === 'full'",
  },
})
export class Skeleton {
  readonly shape = input.required<
    'text' | 'title' | 'circle' | 'tile' | 'tile-2xl' | 'card' | 'btn' | 'pill' | 'bubble' | 'thumb'
  >();
  /** `full` stretches the shape across its container; a number is that share of it in percent. */
  readonly width = input<SkeletonWidth>('auto');
}

/** The widths the design system gives a skeleton (`w-20` to `w-80`, `w-full`). */
export type SkeletonWidth = 'auto' | 'full' | 20 | 30 | 40 | 50 | 60 | 70 | 80;
