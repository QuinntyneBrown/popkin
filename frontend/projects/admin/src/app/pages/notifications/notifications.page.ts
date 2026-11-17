import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  ACTIVITY_EMAILS,
  ADMIN_PLATFORM_API,
  BIRTHDAY_LEADS,
  AdminNotificationHold,
  AdminNotificationKind,
  AdminNotificationsStore,
  AdminSendStatus,
  AdminSessionStore,
  HELD_SUB,
  NOTIFICATIONS_SUB,
  PAUSED_TOAST,
  PopkinColour,
  accentOf,
  activityEmailHelp,
  NotificationDefaultField,
  heldNote,
  RELEASED_TOAST,
  heldToast,
  holdBy,
  holdDialog,
  releaseDialog,
  holdLine,
  holdName,
  holdUntil,
  PAUSE_DIALOG,
  RESUMED_TOAST,
  Toaster,
  resumeDialog,
  NotificationKindId,
  kindAbout,
  kindDialog,
  kindOpened,
  kindSent,
  kindToast,
  kindTotals,
  statusText,
  statusTitle,
} from 'api';
import {
  AsideNote,
  Button,
  DataTable,
  DataTableAction,
  DataTableCell,
  DataTableColumn,
  DataTableGroup,
  DataTableRow,
  DataTableSwitch,
  EmptyState,
  Icon,
  LimitField,
  LimitFieldChange,
  LimitRow,
  PageHead,
  PageTabs,
  Panel,
  PickList,
  PickListOption,
  Popover,
  SearchField,
  SegmentedControl,
  SegmentedOption,
  SaveBar,
  SendStatus,
  Skeleton,
} from 'components';
import {
  NotificationActionData,
  NotificationActionDialog,
} from '../../dialogs/notification-action/notification-action.dialog';

/** The page's tabs, kept in `?tab=` (docs/detailed-designs/admin-platform/notifications). */
export type NotificationsTab = 'kinds' | 'holds' | 'defaults';
const TABS: readonly NotificationsTab[] = ['kinds', 'holds', 'defaults'];

const KIND_COLUMNS: readonly DataTableColumn[] = [
  { label: 'Notification' },
  { label: 'Sent, 24 h', num: true, wide: true },
  { label: 'Opened', num: true, wide: true },
  { label: 'For everyone', end: true },
];

const HOLD_COLUMNS: readonly DataTableColumn[] = [
  { label: 'Held' },
  { label: 'Why' },
  { label: 'Until' },
  { label: 'Actions', hidden: true, end: true },
];

/** People have no colour of their own; the list gives each the next, as the mock does. */
const PERSON_ACCENTS = ['coral', 'teal', 'plum', 'amber', 'sky', 'berry'];

/**
 * Notifications (L2-169): whether member email is going out, and each kind's traffic, with a
 * switch per kind for everyone. The page reads itself again every minute.
 */
@Component({
  selector: 'pk-notifications-page',
  imports: [
    AsideNote,
    Button,
    DataTable,
    EmptyState,
    Icon,
    LimitRow,
    PageHead,
    PageTabs,
    Panel,
    PickList,
    Popover,
    RouterLink,
    SearchField,
    SegmentedControl,
    SaveBar,
    SendStatus,
    Skeleton,
  ],
  providers: [AdminNotificationsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications.page.html',
})
export class NotificationsPage {
  /** `?tab=`, bound by the router. */
  readonly tab = input<string>();

  protected readonly store = inject(AdminNotificationsStore);
  private readonly api = inject(ADMIN_PLATFORM_API);
  private readonly session = inject(AdminSessionStore);
  private readonly dialog = inject(Dialog);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);
  private readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  protected readonly sub = NOTIFICATIONS_SUB;
  protected readonly kindColumns = KIND_COLUMNS;
  protected readonly holdColumns = HOLD_COLUMNS;
  protected readonly heldSub = HELD_SUB;
  protected readonly defaultsSub =
    'What a member starts with. Anyone who has changed a setting keeps theirs.';
  protected readonly activityEmails: SegmentedOption[] = ACTIVITY_EMAILS.map((o) => ({ ...o }));

  /** The Defaults tab's rows from the draft: each field, its error and the foot (L2-173). */
  protected readonly defaultFields = computed(() => {
    const draft = this.store.defaults();
    if (!draft) return null;
    const v = draft.values;
    const bundle = draft.error('bundleMinutes')
      ? draft.saved.bundleMinutes
      : Number(v.bundleMinutes);
    const quiet = (key: 'quietFrom' | 'quietTo', label: string): LimitField => ({
      key,
      label,
      value: v[key],
      invalid: !!draft.error(key),
    });
    return {
      draft,
      activityHelp: activityEmailHelp(v.activityEmail, bundle),
      bundle: [{ key: 'bundleMinutes', value: v.bundleMinutes, numeric: true }] as LimitField[],
      most: [{ key: 'mostEmailsPerDay', value: v.mostEmailsPerDay, numeric: true }] as LimitField[],
      quiet: [quiet('quietFrom', 'Quiet hours start'), quiet('quietTo', 'Quiet hours end')],
      quietError: draft.error('quietFrom') ?? draft.error('quietTo'),
      lead: [
        { key: 'birthdayLead', value: v.birthdayLead, options: BIRTHDAY_LEADS },
      ] as LimitField[],
      foot: 'Nothing changed yet.',
    };
  });

  /** Why the signed-in admin cannot hold or release (L2-172 AC7). */
  protected readonly holdBlocked = computed(() => this.session.blockedReason('HoldNotifications'));

  /** Each hold: its Popkin or person, why, who and when, until when, and "Release" (L2-172). */
  protected readonly holdGroups = computed<DataTableGroup[]>(() => {
    const holds = this.store.holds()?.holds ?? [];
    const people = holds.filter((h) => h.person);
    return [{ rows: holds.map((hold) => this.holdRow(hold, people.indexOf(hold))) }];
  });

  /** Whether "Hold a Popkin"'s popover is open (L2-172 AC2). */
  protected readonly adding = signal(false);

  protected readonly holdOptions = computed<PickListOption[]>(() =>
    this.store.holdMatches().map((m) => ({
      id: m.popkinId,
      name: m.name,
      emoji: m.emoji,
      accent: accentOf(m.colour as PopkinColour),
      detail: m.inviteCode,
    })),
  );

  protected readonly heldNote = computed(() =>
    heldNote(this.store.holds()?.suppressedAddresses ?? null),
  );

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
    // Holds are read when their tab first shows.
    effect(() => {
      if (this.current() === 'holds' && untracked(this.store.holdsStatus) === 'idle') {
        untracked(() => this.store.loadHolds());
      }
    });
    // Defaults are read when their tab first shows.
    effect(() => {
      if (this.current() === 'defaults' && untracked(this.store.defaultsStatus) === 'idle') {
        untracked(() => this.store.loadDefaults());
      }
    });
  }

  /** A default typed or chosen (L2-173 AC3). */
  protected editDefault(change: LimitFieldChange): void {
    this.store.editDefault(change.key as NotificationDefaultField, change.value);
  }

  /** Opens "Hold a Popkin" with every Popkin that can be held, or closes it. */
  protected toggleAdding(): void {
    const open = !this.adding();
    this.adding.set(open);
    if (open) this.store.searchHolds('');
  }

  /** A match picked: "Hold {Popkin}?" with a reason (L2-172 AC2, L2-087 AC1). */
  protected pickHold(popkinId: string | null): void {
    const match = this.store.holdMatches().find((m) => m.popkinId === popkinId);
    if (!match) return;
    this.adding.set(false);
    this.ask<AdminNotificationHold>({
      text: holdDialog(match.name),
      danger: false,
      send: (reason) => this.api.holdPopkin(match.popkinId, reason),
    }).subscribe((hold) => {
      if (!hold) return;
      this.store.holdAdded(hold);
      this.toaster.show('success', ...heldToast(match.name));
    });
  }

  /** "Release the hold on {name}?" with a reason (L2-172 AC4). */
  protected release(event: DataTableAction): void {
    const hold = this.store.holds()?.holds.find((h) => h.id === event.rowId);
    if (!hold?.id) return;
    const holdId = hold.id;
    this.ask<true>({
      text: releaseDialog(holdName(hold)),
      danger: false,
      send: (reason) => this.api.releaseHold(holdId, reason).pipe(map(() => true as const)),
    }).subscribe((released) => {
      if (!released) return;
      this.store.holdReleased(holdId);
      this.toaster.show('success', ...RELEASED_TOAST);
    });
  }

  private holdRow(hold: AdminNotificationHold, person: number): DataTableRow {
    const name = holdName(hold);
    const who: DataTableCell = hold.popkin
      ? {
          kind: 'popkin',
          text: name,
          sub: holdLine(hold),
          emoji: hold.popkin.emoji,
          accent: accentOf(hold.popkin.colour as PopkinColour),
        }
      : {
          kind: 'person',
          text: name,
          sub: holdLine(hold),
          photo: hold.person?.avatar ?? null,
          accent: PERSON_ACCENTS[person % PERSON_ACCENTS.length],
        };
    // An automatic hold ends with its suspension or deletion, not here (L2-172 AC5).
    const end: DataTableCell =
      hold.automatic || !hold.id
        ? { kind: 'status', text: 'Automatic' }
        : {
            kind: 'action',
            text: 'Release',
            label: `Release the hold on ${name}`,
            action: 'release',
            disabledReason: this.holdBlocked(),
          };
    return {
      id: hold.id ?? `automatic-${hold.target}-${hold.person?.id ?? hold.popkin?.id}`,
      cells: [
        who,
        { kind: 'note', text: hold.why, sub: holdBy(hold, this.timeZone) },
        { text: holdUntil(hold.until) },
        end,
      ],
    };
  }

  /** "Pause all member email?" (L2-170 AC1). */
  protected pause(): void {
    this.ask<AdminSendStatus>({
      text: PAUSE_DIALOG,
      danger: true,
      send: (reason) => this.api.pauseEmail(reason),
    }).subscribe((status) => {
      if (!status) return;
      this.store.statusSaved(status);
      this.toaster.show('success', ...PAUSED_TOAST);
    });
  }

  /** "Resume sending?" (L2-170 AC3). */
  protected resume(status: AdminSendStatus): void {
    this.ask<AdminSendStatus>({
      text: resumeDialog(status),
      danger: false,
      send: (reason) => this.api.resumeEmail(reason),
    }).subscribe((saved) => {
      if (!saved) return;
      this.store.statusSaved(saved);
      this.toaster.show('success', ...RESUMED_TOAST);
    });
  }

  /**
   * A kind's switch turned: "Turn {kind} off for everyone?" or "Turn {kind} back on?" (L2-171
   * AC1, AC3). The switch goes back unless the dialog saves.
   */
  protected switchKind(event: DataTableSwitch): void {
    const kind = this.store
      .groups()
      .flatMap((g) => g.kinds)
      .find((k) => k.kind === event.rowId);
    if (!kind) return event.revert();
    this.ask<AdminNotificationKind>({
      text: kindDialog(kind.name, event.on),
      danger: !event.on,
      send: (reason) => this.api.switchKind(kind.kind as NotificationKindId, event.on, reason),
    }).subscribe((saved) => {
      if (!saved) return event.revert();
      this.store.kindSaved(saved);
      this.toaster.show('success', ...kindToast(kind.name, event.on));
    });
  }

  /** Opens the reason dialog; it closes with the saved answer, or nothing when cancelled. */
  private ask<T>(data: NotificationActionData<T>) {
    return this.dialog.open<T, NotificationActionData<T>>(NotificationActionDialog<T>, {
      data,
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      // Focus starts in the reason (L2-087 AC1).
      autoFocus: 'textarea',
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    }).closed;
  }

  protected choose(tab: string): void {
    void this.router.navigate([], {
      queryParams: { tab: tab === 'kinds' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
