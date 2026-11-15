import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { ChartLegend, LegendKey } from '../chart-legend/chart-legend';

/** A block of the timeline, in percent of the noon-to-midnight track. */
export interface ShiftBlockView {
  left: number;
  width: number;
  /** "Working till 5:30 pm". */
  label: string;
}

/** A member's row: their avatar, first name and working stretches. */
export interface ShiftRow {
  name: string;
  avatar: { initials: string; accent: string; photoUrl: string | null };
  blocks: ShiftBlockView[];
}

/**
 * Shifts (docs/design-system/components/schedule.html): the chosen day from noon to midnight, a
 * row per member with a block per working stretch and, when everyone is free, a tint from the
 * time they are. The picture is hidden from assistive technology, which reads `text` instead
 * (L2-074 AC5, AC6).
 */
@Component({
  selector: 'figure[pk-shifts]',
  imports: [Avatar, ChartLegend],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shifts.html',
  styleUrl: './shifts.scss',
  host: { class: 'shifts', '[attr.aria-label]': 'label()' },
})
export class Shifts {
  /** "Who is working on Wednesday". */
  readonly label = input.required<string>();
  /** Each member's working stretches as text: "Mara: working 9 am to 5:30 pm; …". */
  readonly text = input.required<string>();
  readonly rows = input.required<ShiftRow[]>();
  /** Where the tint starts, in percent of the track; null when someone works in the evening. */
  readonly tint = input<number | null>(null);
  readonly legend = input.required<LegendKey[]>();

  protected readonly ticks = [
    { label: '12 pm', at: 0 },
    { label: '3 pm', at: 25 },
    { label: '6 pm', at: 50 },
    { label: '9 pm', at: 75 },
    { label: 'Midnight', at: 100 },
  ];
}
