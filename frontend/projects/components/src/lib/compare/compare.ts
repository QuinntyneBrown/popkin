import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { Mark } from '../mark/mark';

/** One row of the comparison: what is compared, and what each side does about it. */
export interface CompareRow {
  label: string;
  theirs: string;
  ours: string;
}

/**
 * Comparison (docs/design-system/components/compare.html): Popkin beside something else, row by
 * row, as a `table` with a caption for assistive technology only, column headers and row
 * headers. The two columns are told apart by their heading and by an icon in every cell (a dash
 * for theirs, a tick for ours), never by colour alone (L2-001 AC4, L2-057 AC5). The icons are
 * decoration: the headings carry the meaning.
 */
@Component({
  selector: 'table[pk-compare]',
  imports: [Icon, Mark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compare.html',
  styleUrl: './compare.scss',
  host: { class: 'compare' },
})
export class Compare {
  /** Read by assistive technology only: "A group chat compared with a Popkin". */
  readonly caption = input.required<string>();
  /** The header of the row headers' column, for assistive technology only. */
  readonly what = input('What');
  /** The heading of the other side's column: "Group chat". */
  readonly theirs = input.required<string>();
  /** The heading of Popkin's column, after the mark. */
  readonly ours = input('Popkin');
  readonly rows = input.required<readonly CompareRow[]>();
}
