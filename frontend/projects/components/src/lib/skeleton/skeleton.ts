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
    '[class.w-full]': "width() === 'full'",
  },
})
export class Skeleton {
  readonly shape = input.required<
    'text' | 'title' | 'circle' | 'tile' | 'tile-2xl' | 'card' | 'btn' | 'pill'
  >();
  /** `full` stretches the shape across its container. */
  readonly width = input<'auto' | 'full'>('auto');
}
