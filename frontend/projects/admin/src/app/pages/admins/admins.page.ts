import { Dialog } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AdminRole,
  AdminRow,
  AdminSessionStore,
  AdminsStore,
  PERMISSION_LINES,
  ROLE_SENTENCES,
  Toaster,
  lastActiveText,
} from 'api';
import {
  Button,
  DataTable,
  DataTableAction,
  DataTableCell,
  DataTableChoice,
  DataTableColumn,
  DataTableGroup,
  EmptyState,
  Icon,
  PageHead,
  Panel,
  PermissionTable,
  PermissionTableRow,
  SegmentedControl,
  SegmentedOption,
  Toolbar,
} from 'components';
import { map } from 'rxjs';
import { AddAdminDialog, AddAdminData } from '../../dialogs/admin-add/admin-add.dialog';
import {
  ChangeAdminRoleDialog,
  ChangeAdminRoleData,
} from '../../dialogs/admin-change-role/admin-change-role.dialog';
import { RemoveAdminDialog } from '../../dialogs/admin-remove/admin-remove.dialog';

const ROLES: readonly AdminRole[] = ['Owner', 'Support', 'Viewer'];
const ACCENTS = ['plum', 'teal', 'coral', 'amber', 'sky', 'berry'];

/** Admins & roles (L2-119, L2-086): who can sign in to the console, and what each role can do. */
@Component({
  selector: 'pk-admins-page',
  imports: [
    Button,
    DataTable,
    EmptyState,
    Icon,
    PageHead,
    Panel,
    PermissionTable,
    RouterLink,
    SegmentedControl,
    Toolbar,
  ],
  providers: [AdminsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admins.page.html',
})
export class AdminsPage {
  protected readonly store = inject(AdminsStore);
  private readonly session = inject(AdminSessionStore);
  private readonly dialog = inject(Dialog);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  protected readonly roleSentences = ROLES.map((role) => ({ role, text: ROLE_SENTENCES[role] }));

  protected readonly view = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(
      map((params) => (params.get('view') === 'roles' ? 'roles' : 'admins')),
    ),
    { initialValue: 'admins' },
  );

  /** Why the signed-in admin cannot add, change or remove admins, or null when they can. */
  protected readonly blocked = computed(() => this.session.blockedReason('ManageAdmins'));

  protected readonly sub = computed(() => {
    const count = this.store.admins().length;
    return this.store.status() === 'ready'
      ? `${count} ${count === 1 ? 'person' : 'people'} can sign in to this console`
      : undefined;
  });

  protected readonly tabs = computed<SegmentedOption[]>(() => [
    {
      value: 'admins',
      label: 'Admins',
      count: this.store.status() === 'ready' ? this.store.admins().length : undefined,
    },
    { value: 'roles', label: 'What each role can do' },
  ]);

  protected readonly columns: DataTableColumn[] = [
    { label: 'Admin' },
    { label: 'Role' },
    { label: 'Last active' },
    { label: 'Actions', hidden: true, end: true },
  ];

  protected readonly groups = computed<DataTableGroup[]>(() => {
    const now = new Date();
    return [
      {
        rows: this.store.admins().map((admin, i) => ({
          id: admin.id,
          cells: [
            {
              text: admin.name,
              kind: 'person',
              sub: admin.email,
              badge: admin.isYou ? 'You' : undefined,
              accent: ACCENTS[i % ACCENTS.length],
            },
            this.roleCell(admin),
            { text: lastActiveText(admin.lastActiveAt, admin.invited, now, this.timeZone) },
            admin.isYou
              ? { text: '' }
              : {
                  text: 'Remove',
                  kind: 'action',
                  action: 'remove',
                  label: `Remove ${admin.name}`,
                  disabledReason: this.blocked(),
                },
          ],
        })),
      },
    ];
  });

  protected readonly permissionRows = computed<PermissionTableRow[]>(() => {
    const rows = new Map(this.store.roles()?.rows.map((row) => [row.row, row]));
    return PERMISSION_LINES.flatMap((line) => {
      const row = rows.get(line.row);
      return row ? [{ group: line.group, label: line.label, ...row }] : [];
    });
  });

  constructor() {
    this.store.load();
    this.store.loadRoles();
  }

  protected showView(view: string): void {
    void this.router.navigate([], { queryParams: { view: view === 'roles' ? 'roles' : null } });
  }

  protected add(): void {
    const opener = this.document.activeElement as HTMLElement | null;
    const ref = this.dialog.open<AdminRow, AddAdminData>(AddAdminDialog, {
      data: { admins: this.store.admins() },
      ...this.dialogConfig('staff'),
    });
    ref.closed.subscribe((row) => {
      opener?.focus();
      if (!row) return;
      this.store.added(row);
      this.toaster.show(
        'success',
        `Invite sent to ${row.email}`,
        `They’re ${row.role === 'Owner' ? 'an' : 'a'} ${row.role} admin once they sign in with a code.`,
      );
    });
  }

  protected chose(choice: DataTableChoice): void {
    const admin = this.store.admins().find((row) => row.id === choice.rowId);
    if (!admin) return;
    const ref = this.dialog.open<AdminRow, ChangeAdminRoleData>(ChangeAdminRoleDialog, {
      data: { admin, role: choice.value as AdminRole },
      ...this.dialogConfig('reason'),
    });
    ref.closed.subscribe((row) => {
      if (!row) {
        choice.revert();
        return;
      }
      this.store.replaced(row);
      this.toaster.show(
        'success',
        `${row.name} is now ${row.role === 'Owner' ? 'an' : 'a'} ${row.role}`,
      );
    });
  }

  protected acted(action: DataTableAction): void {
    const admin = this.store.admins().find((row) => row.id === action.rowId);
    if (!admin) return;
    const ref = this.dialog.open<boolean, AdminRow>(RemoveAdminDialog, {
      data: admin,
      ...this.dialogConfig('reason'),
    });
    ref.closed.subscribe((removed) => {
      if (!removed) return;
      this.store.removed(admin.id);
      this.toaster.show(
        'success',
        `${admin.name} removed`,
        'They’re signed out of the console. Their past actions stay in the audit log.',
      );
    });
  }

  /** The admin's role: a select for an Owner, or the role with why it cannot change. */
  private roleCell(admin: AdminRow): DataTableCell {
    const locked = admin.isYou
      ? 'You can’t change your own role'
      : (this.blocked() ?? (admin.isLastOwner ? 'The console needs at least one Owner.' : null));
    if (locked) return { text: admin.role, title: locked };
    return {
      text: admin.role,
      kind: 'role',
      label: `Role for ${admin.name}`,
      value: admin.role,
      options: ROLES.map((role) => ({ value: role, label: role })),
    };
  }

  private dialogConfig(focus: string) {
    return {
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      autoFocus: `#${focus}`,
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    };
  }
}
