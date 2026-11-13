import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Skeleton } from '../skeleton/skeleton';

/** One photo of the grid. */
export interface GridPhoto {
  /** The route that opens the photo. */
  link: string | readonly unknown[];
  /** The thumbnail. */
  src: string;
  /** What the photo shows: its caption, or who added it and when (L2-032 AC7). */
  alt: string;
  /** Larger than the rest, two cells by two: the first photo of the latest day. */
  feature?: boolean;
}

/**
 * Photo grid (docs/design-system/components/photo-grid.html): the photos of one day of the
 * album as square cells, each a link named by its `alt`. Three across on a phone; in the album
 * (`pk-album`) four from 640 px, five from 1024 px and six from 1280 px, with wider gaps and
 * rounded corners from 768 px (L2-058 AC7). The pictures load as they come near the screen, into
 * cells whose size is set before they arrive.
 *
 * While `loading` it is nine skeleton cells, the first one larger; hide it from assistive
 * technology beside a status line, as `pk-album` does.
 */
@Component({
  selector: 'div[pk-photo-grid]',
  imports: [RouterLink, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-grid.html',
  styleUrl: './photo-grid.scss',
  host: { class: 'photo-grid' },
})
export class PhotoGrid {
  readonly photos = input<readonly GridPhoto[]>([]);
  /** Skeleton cells in place of the photos. */
  readonly loading = input(false);

  protected readonly cells = Array.from({ length: 9 });
}
