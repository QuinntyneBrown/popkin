import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Evidence (docs/design-system/components/report-review.html): the reported content as it was
 * posted, so an admin judges the thing itself. In a row (the default) the words sit beside a small
 * photo; `stacked`, as on Reports, puts the author (its avatar in `[slot=avatar]`) over a full
 * picture and the words. `removed` greys the words of content already taken down; it keeps its
 * place.
 */
@Component({
  selector: 'div[pk-evidence]',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './evidence.html',
  styleUrl: './evidence.scss',
  host: {
    class: 'evidence',
    '[class.evidence--stacked]': 'stacked()',
    '[class.evidence--removed]': 'removed()',
  },
})
export class Evidence {
  readonly text = input<string>();
  readonly photo = input<string>();
  /** What the photo shows, said by its alternative text: "The reported photo: …". */
  readonly photoAlt = input('');
  /** The author's name, shown with `[slot=avatar]` when stacked. */
  readonly author = input<string>();
  readonly stacked = input(false);
  readonly removed = input(false);
}
