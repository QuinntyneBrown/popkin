import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * A cell: plain text; `strong`; `time`, subtle and in even figures; or `name`, a name with a
 * line under it (`sub`).
 */
export interface DataTableCell {
  text: string;
  kind?: 'text' | 'strong' | 'time' | 'name';
  sub?: string;
}

export interface DataTableRow {
  id: string | number;
  cells: readonly DataTableCell[];
}

/** Rows under a heading row, such as a day: "Today". Without a label the rows stand alone. */
export interface DataTableGroup {
  label?: string;
  rows: readonly DataTableRow[];
}

/**
 * Data table (docs/design-system/components/data-table.html): a list that is a table from
 * 768 px and stacked records below it, each field labelled by its column's name (L2-089 AC3).
 * The first column leads each record and is not labelled. While `loading` it draws five rows of
 * bars instead, the first twice as wide; the page announces the loading in words.
 */
@Component({
  selector: 'div[pk-data-table]',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  host: { class: 'table-wrap' },
})
export class DataTable {
  /** The table's accessible name: "Audit log". */
  readonly label = input.required<string>();
  readonly columns = input.required<readonly string[]>();
  readonly groups = input.required<readonly DataTableGroup[]>();
  /** Rows in the table's shape while it loads, hidden from assistive technology. */
  readonly loading = input(false);

  protected readonly skeletonRows = [0, 1, 2, 3, 4];
}
