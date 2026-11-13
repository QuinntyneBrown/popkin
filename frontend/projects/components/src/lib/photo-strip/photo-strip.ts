import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One photo of the strip. */
export interface StripPhoto {
  /** The route that opens the photo. */
  link: string | readonly unknown[];
  src: string;
  /** What the photo shows: its caption, or who added it and when. */
  alt: string;
}

/**
 * The latest photos of the Popkin home (docs/design-system/components/photo-grid.html,
 * `hscroll hscroll--grid` of `thumb`): on a phone a strip of six that scrolls sideways; from
 * 768 px a grid, four abreast, three from 1024 px and four again from 1280 px. Give it up to
 * eight photos, newest first: six show below 768 px and from 1024 px, eight at 768 px and from
 * 1280 px, so a wider screen shows more photos, never different ones (L2-058 AC11). Each photo
 * is a link named by its `alt`.
 */
@Component({
  selector: 'div[pk-photo-strip]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-strip.html',
  styleUrl: './photo-strip.scss',
  host: { class: 'hscroll hscroll--grid' },
})
export class PhotoStrip {
  readonly photos = input.required<readonly StripPhoto[]>();
}
