import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** An emoji a member can react with, and its name: "Heart". */
export interface ReactionOption {
  emoji: string;
  name: string;
}

/**
 * Reaction grid (docs/design-system/components/emoji-picker.html, `emoji-grid`): the reactions
 * of the message actions, a group of toggle buttons named "React heart" and so on (L2-024 AC1).
 * Those the member already chose are `aria-pressed` and ringed, not only coloured (L2-057 AC5);
 * choosing one again takes it back. Unlike `pk-emoji-picker` it keeps no value: each choice is
 * a `react` for the consumer to apply.
 *
 * `label` names the group: "Reactions", or "More reactions" for the grid that button opens,
 * whose `id` the button's `aria-controls` names.
 */
@Component({
  selector: 'div[pk-reaction-grid]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reaction-grid.html',
  styleUrl: './reaction-grid.scss',
  host: { class: 'emoji-grid', role: 'group', '[attr.aria-label]': 'label()' },
})
export class ReactionGrid {
  readonly label = input('Reactions');
  readonly options = input.required<readonly ReactionOption[]>();
  /** The emoji the member has reacted with. */
  readonly pressed = input<readonly string[]>([]);

  /** The emoji chosen. */
  readonly react = output<string>();
}
