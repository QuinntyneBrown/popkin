import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PhotoGrid } from '../photo-grid/photo-grid';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The album (docs/design-system/components/photo-grid.html, `album`): the body of the Photos
 * tab, inside a `flush` body of the app screen. It holds a group label and a photo grid for each
 * day, or the empty state that stands in for them, and leaves room at its end for the floating
 * action and the tabs. The grids and labels inside it follow the album's form factors
 * (L2-058 AC7).
 *
 * While `loading` it draws its own skeleton, a label and a grid, with a status line for
 * assistive technology (L2-056 AC1).
 *
 * Slots: the default slot holds the days (`pk-group-label`, `pk-photo-grid`) or a
 * `pk-empty-state`; `[slot=more]` sits under the last day, in line with the grid: the sentinel
 * that asks for the next page, and the alert of a page that did not load.
 */
@Component({
  selector: 'div[pk-album]',
  imports: [PhotoGrid, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './album.html',
  styleUrl: './album.scss',
  host: { class: 'album' },
})
export class Album {
  /** The skeleton of the album, in place of its days. */
  readonly loading = input(false);
  /** What the status line says while it loads. */
  readonly loadingText = input('Loading photos…');
}
