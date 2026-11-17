import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chip } from '../chip/chip';

/** A group as a chip: its emoji and name. */
export interface GroupChipItem {
  emoji: string;
  name: string;
  link: string | readonly unknown[];
}

/**
 * Group chips (docs/design-system/components/chip.html, `chips` of outline links): a contact's
 * groups on their profile, each opening that group (L2-146 AC4). The emoji is decoration.
 */
@Component({
  selector: 'div[pk-group-chips]',
  imports: [Chip, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-chips.html',
  styleUrl: './group-chips.scss',
  host: { class: 'chips' },
})
export class GroupChips {
  readonly groups = input.required<readonly GroupChipItem[]>();
}
