import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuditLogStore, groupByDay, timeText } from 'api';
import {
  Button,
  DataTable,
  DataTableGroup,
  EmptyState,
  Icon,
  Link,
  PageHead,
  Panel,
  SearchField,
  SelectField,
  SelectOption,
  Toolbar,
} from 'components';

/** The audit log (L2-120): every action taken in the console, newest first, by day. */
@Component({
  selector: 'pk-audit-page',
  imports: [
    Button,
    DataTable,
    EmptyState,
    Icon,
    Link,
    PageHead,
    Panel,
    RouterLink,
    SearchField,
    SelectField,
    Toolbar,
  ],
  providers: [AuditLogStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './audit.page.html',
})
export class AuditPage {
  protected readonly store = inject(AuditLogStore);
  private readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  protected readonly columns = ['Time', 'Admin', 'Action', 'Target and reason'];

  protected readonly adminOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All admins' },
    ...this.store.admins().map((admin) => ({ value: admin.id, label: admin.name })),
  ]);

  protected readonly groups = computed<DataTableGroup[]>(() =>
    groupByDay(this.store.entries(), new Date(), this.timeZone).map((day) => ({
      label: day.label,
      rows: day.entries.map((entry) => ({
        id: entry.id,
        cells: [
          { text: timeText(entry.at, this.timeZone), kind: 'time' },
          { text: entry.adminName, kind: 'strong' },
          { text: entry.actionLabel },
          { text: entry.targetName, kind: 'name', sub: entry.reason ?? undefined },
        ],
      })),
    })),
  );

  constructor() {
    this.store.load();
  }
}
