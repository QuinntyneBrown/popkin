import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Group label (docs/design-system/components/photo-grid.html, `group-label`): the small heading
 * of one group of a long list, such as a day of the album: "Saturday". In the album it keeps
 * the grid's distance from the sides at every width.
 */
@Component({
  selector: 'h2[pk-group-label], h3[pk-group-label]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-label.html',
  styleUrl: './group-label.scss',
  host: { class: 'group-label', '[class.group-label--first]': 'first()' },
})
export class GroupLabel {
  /** The first group sits right under the screen's header: no room above it. */
  readonly first = input(false);
}
