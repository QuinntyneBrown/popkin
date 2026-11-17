import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';
import { Status } from '../status/status';
import { Switch } from '../switch/switch';

/** A column: its name, and whether the name is for assistive technology only ("Actions"). */
export interface DataTableColumn {
  label: string;
  hidden?: boolean;
  /** The column of a row's actions, at the row's end. */
  end?: boolean;
  /** Figures: right-aligned, in even digits. */
  num?: boolean;
  /** Shown from 768 px only; on a phone the lead cell says it instead (L2-169 AC5). */
  wide?: boolean;
}

/**
 * A cell: plain text, `strong`, `time` (subtle, even figures), `name` (a name with a line under
 * it), `person` (a name, a badge such as "You" and an email by an avatar in `accent`), `role` (a
 * select of `options` named `label`), `action` (a quiet button named `label`, switched off
 * with a `disabledReason`), `kind` (a notification kind's name, with the status pill `off` and
 * what sends it under it, and `totals` under that on a phone), `switch` (a switch named
 * `label`, `on` or not, switched off with a `disabledReason`) or `lock` (a lock and its words,
 * "Required"). `title` is a tooltip on plain text.
 */
export interface DataTableCell {
  text: string;
  kind?:
    'text' | 'strong' | 'time' | 'name' | 'person' | 'role' | 'action' | 'kind' | 'switch' | 'lock';
  sub?: string;
  title?: string;
  badge?: string;
  accent?: string;
  label?: string;
  value?: string;
  options?: readonly { value: string; label: string }[];
  /** The action a button takes, given back with the row when it is pressed. */
  action?: string;
  disabledReason?: string | null;
  /** A switch's state. */
  on?: boolean;
  /** The status pill beside a kind's name: "Off for everyone". */
  off?: string;
  /** A kind's totals, under its name on a phone. */
  totals?: string;
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

/** A role chosen in a row; `revert` puts the select back, as when its dialog is cancelled. */
export interface DataTableChoice {
  rowId: string | number;
  value: string;
  revert: () => void;
}

/** A switch turned in a row; `revert` turns it back, as when its dialog is cancelled. */
export interface DataTableSwitch {
  rowId: string | number;
  on: boolean;
  revert: () => void;
}

export interface DataTableAction {
  rowId: string | number;
  action: string;
}

/**
 * Data table (docs/design-system/components/data-table.html): a list that is a table from
 * 768 px and stacked records below it, each field labelled by its column's name (L2-089 AC3).
 * The first column leads each record and is not labelled. While `loading` it draws five rows of
 * bars instead, the first twice as wide; the page announces the loading in words.
 */
@Component({
  selector: 'div[pk-data-table]',
  imports: [Avatar, Badge, Button, Icon, Skeleton, Status, Switch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  host: { class: 'table-wrap' },
})
export class DataTable {
  /** The table's accessible name: "Audit log". */
  readonly label = input.required<string>();
  readonly columns = input.required<readonly (string | DataTableColumn)[]>();
  readonly groups = input.required<readonly DataTableGroup[]>();
  readonly loading = input(false);

  readonly chose = output<DataTableChoice>();
  readonly acted = output<DataTableAction>();
  readonly switched = output<DataTableSwitch>();

  private reverting = false;

  /**
   * Tells the consumer a switch turned, with how to turn it back. Setting the switch's model
   * emits its change too, so the change a revert makes is not passed on as a new turn.
   */
  protected turned(toggle: Switch, rowId: string | number, on: boolean): void {
    if (this.reverting) return;
    this.switched.emit({
      rowId,
      on,
      revert: () => {
        this.reverting = true;
        toggle.checked.set(!on);
        this.reverting = false;
      },
    });
  }

  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  protected columnAt(index: number): DataTableColumn {
    const column = this.columns()[index];
    return typeof column === 'string' ? { label: column } : column;
  }

  protected choose(rowId: string | number, event: Event, was: string): void {
    const select = event.target as HTMLSelectElement;
    this.chose.emit({ rowId, value: select.value, revert: () => (select.value = was) });
  }
}
