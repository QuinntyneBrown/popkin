import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

let nextId = 0;

/**
 * Band (docs/design-system/components/band.html): one section of the landing page, across the
 * page, its content in the page's container. It has the section's `h2`, an optional lead and the
 * projected content, and it is named by its heading for assistive technology.
 *
 * With `anchor` the section is a place the navigation jumps to: the section takes that `id` and
 * its heading takes `<anchor>-h` and `tabindex="-1"`, so the page can scroll to the section and
 * move focus to the heading (L2-002 AC5). A band whose content brings its own heading (the
 * closing band) names it with `labelledby` instead of `heading`.
 */
@Component({
  selector: 'section[pk-band]',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './band.html',
  styleUrl: './band.scss',
  host: {
    '[class.band]': "surface() !== 'canvas'",
    '[class.band--sand]': "surface() === 'sand'",
    '[attr.id]': 'anchor()',
    '[attr.aria-labelledby]': 'labelId()',
  },
})
export class Band {
  /** `canvas` is the page itself; `surface` is ruled off above and below; `sand` is tinted. */
  readonly surface = input<'canvas' | 'surface' | 'sand'>('canvas');
  /** `narrow` keeps a table or a column of text readable. */
  readonly width = input<'base' | 'narrow'>('base');
  /** The section's `h2`. */
  readonly heading = input<string>();
  /** The paragraph that goes with the heading. */
  readonly lead = input<string>();
  /** `split` sets the lead beside the heading where there is room, at the end of the line. */
  readonly head = input<'stack' | 'split'>('stack');
  /** The fragment the navigation jumps to: "how". */
  readonly anchor = input<string>();
  /** The id of the heading the content brings, when the band has no `heading`. */
  readonly labelledby = input<string>();

  private readonly generatedId = `band-${++nextId}-h`;
  protected readonly headingId = computed(() => {
    const anchor = this.anchor();
    return anchor ? `${anchor}-h` : this.generatedId;
  });
  protected readonly labelId = computed(() =>
    this.heading() ? this.headingId() : this.labelledby(),
  );
}
