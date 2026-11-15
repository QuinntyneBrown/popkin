import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** A line of the table: what an admin may do, under its group, and which roles may. */
export interface PermissionTableRow {
  group: string;
  label: string;
  owner: boolean;
  support: boolean;
  viewer: boolean;
}

export interface PermissionTableCounts {
  owner: number;
  support: number;
  viewer: number;
}

/**
 * Permission table (docs/design-system/components/permission-table.html): what each role can
 * do. Every cell says "Allowed" or "Not allowed" as well as its mark, so the mark never carries
 * the meaning alone (L2-086 AC4).
 */
@Component({
  selector: 'div[pk-permission-table]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './permission-table.html',
  styleUrl: './permission-table.scss',
  host: { class: 'table-wrap' },
})
export class PermissionTable {
  readonly label = input('What each role can do');
  readonly rows = input.required<readonly PermissionTableRow[]>();
  readonly counts = input.required<PermissionTableCounts>();

  protected readonly roles = computed(() => {
    const counts = this.counts();
    return [
      { key: 'owner', name: 'Owner', count: counts.owner },
      { key: 'support', name: 'Support', count: counts.support },
      { key: 'viewer', name: 'Viewer', count: counts.viewer },
    ] as const;
  });

  protected readonly groups = computed(() => {
    const groups: { label: string; rows: PermissionTableRow[] }[] = [];
    for (const row of this.rows()) {
      const last = groups.at(-1);
      if (last?.label === row.group) last.rows.push(row);
      else groups.push({ label: row.group, rows: [row] });
    }
    return groups;
  });

  protected countText(count: number): string {
    return `${count} ${count === 1 ? 'admin' : 'admins'}`;
  }
}
