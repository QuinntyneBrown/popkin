import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AdminNotificationsStore,
  AdminSessionStore,
  NOTIFICATIONS_SUB,
  kindAbout,
  kindOpened,
  kindSent,
  kindTotals,
  statusText,
  statusTitle,
} from 'api';
import {
  Button,
  DataTable,
  DataTableColumn,
  DataTableGroup,
  EmptyState,
  Icon,
  PageHead,
  PageTabs,
  Panel,
  SegmentedControl,
  SegmentedOption,
  SendStatus,
} from 'components';

/** The page's tabs, kept in `?tab=` (docs/detailed-designs/admin-platform/notifications). */
export type NotificationsTab = 'kinds' | 'holds' | 'defaults';
const TABS: readonly NotificationsTab[] = ['kinds', 'holds', 'defaults'];

const KIND_COLUMNS: readonly DataTableColumn[] = [
  { label: 'Notification' },
  { label: 'Sent, 24 h', num: true, wide: true },
  { label: 'Opened', num: true, wide: true },
  { label: 'For everyone', end: true },
];

/**
 * Notifications (L2-169): whether member email is going out, and each kind's traffic, with a
 * switch per kind for everyone. The page reads itself again every minute.
 */
@Component({
  selector: 'pk-notifications-page',
  imports: [
    Button,
    DataTable,
    EmptyState,
    Icon,
    PageHead,
    PageTabs,
    Panel,
    RouterLink,
    SegmentedControl,
    SendStatus,
  ],
  providers: [AdminNotificationsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications.page.html',
})
export class NotificationsPage {
  /** `?tab=`, bound by the router. */
  readonly tab = input<string>();

  protected readonly store = inject(AdminNotificationsStore);
  private readonly session = inject(AdminSessionStore);
  private readonly router = inject(Router);
  private readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  protected readonly sub = NOTIFICATIONS_SUB;
  protected readonly kindColumns = KIND_COLUMNS;

  /** Why the signed-in admin cannot pause, resume or switch a kind (L2-170 AC5, L2-171 AC5). */
  protected readonly manageBlocked = computed(() =>
    this.session.blockedReason('ManageNotifications'),
  );

  protected readonly current = computed<NotificationsTab>(() =>
    TABS.includes(this.tab() as NotificationsTab) ? (this.tab() as NotificationsTab) : 'kinds',
  );

  protected readonly tabs = computed<SegmentedOption[]>(() => [
    { value: 'kinds', label: 'Kinds', count: this.store.kindCount() },
    { value: 'holds', label: 'Holds', count: this.store.holdCount() },
    { value: 'defaults', label: 'Defaults' },
  ]);

  protected readonly title = computed(() => {
    const sending = this.store.sending();
    return sending ? statusTitle(sending) : '';
  });

  protected readonly text = computed(() => {
    const sending = this.store.sending();
    return sending ? statusText(sending, this.timeZone) : '';
  });

  protected readonly kindGroups = computed<DataTableGroup[]>(() => {
    const blocked = this.manageBlocked();
    return this.store.groups().map((group) => ({
      label: group.name,
      rows: group.kinds.map((kind) => ({
        id: kind.kind,
        cells: [
          {
            kind: 'kind',
            text: kind.name,
            sub: kindAbout(kind, this.timeZone),
            off: kind.offForEveryone ? 'Off for everyone' : undefined,
            totals: kindTotals(kind),
          },
          { text: kindSent(kind) },
          { text: kindOpened(kind) },
          kind.required
            ? { kind: 'lock', text: 'Required' }
            : {
                kind: 'switch',
                text: '',
                label: `${kind.name} for everyone`,
                on: !kind.offForEveryone,
                disabledReason: blocked,
              },
        ],
      })),
    }));
  });

  constructor() {
    this.store.load();
  }

  protected choose(tab: string): void {
    void this.router.navigate([], {
      queryParams: { tab: tab === 'kinds' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
