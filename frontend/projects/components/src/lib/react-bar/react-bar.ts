import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconButton } from '../icon-button/icon-button';
import { ReactionOption } from '../reaction-grid/reaction-grid';

/**
 * React bar (docs/design-system/components/photo-viewer.html, `react-bar`): the quick reactions
 * of a photo, on a veil of the dark stage, a group of toggle buttons named "React heart" and so
 * on (L2-034 AC1), then "More reactions". Those the member already gave are `aria-pressed`,
 * veiled and ringed, not only coloured (L2-057 AC5); choosing one again takes it back. It keeps
 * no value: each choice is a `react`, and "More reactions" a `more`, for the consumer to apply.
 */
@Component({
  selector: 'div[pk-react-bar]',
  imports: [IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './react-bar.html',
  styleUrl: './react-bar.scss',
  host: { class: 'react-bar', role: 'group', '[attr.aria-label]': 'label()' },
})
export class ReactBar {
  readonly label = input('React');
  readonly options = input.required<readonly ReactionOption[]>();
  /** The emoji the member has reacted with. */
  readonly pressed = input<readonly string[]>([]);
  readonly moreLabel = input('More reactions');

  /** The emoji chosen. */
  readonly react = output<string>();
  /** "More reactions". */
  readonly more = output<void>();
}
