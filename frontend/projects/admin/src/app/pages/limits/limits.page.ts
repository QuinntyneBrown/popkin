import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ADMIN_PLATFORM_API,
  AdminLimits,
  AdminLimitsStore,
  AdminSessionStore,
  LimitKeyId,
  SAVE_LIMITS_DIALOG,
  Toaster,
  limitHelp,
  limitName,
  limitsSavedToast,
} from 'api';
import {
  Button,
  EmptyState,
  Icon,
  LimitField,
  LimitFieldChange,
  LimitRow,
  PageHead,
  Panel,
  SaveBar,
  Skeleton,
} from 'components';
import {
  NotificationActionData,
  NotificationActionDialog,
} from '../../dialogs/notification-action/notification-action.dialog';

const SUB = 'Changes apply to every person within a minute of saving.';
const READ_ONLY_SUB = 'Only Owners can change limits.';

/**
 * Limits (docs/detailed-designs/admin-platform/limits): what an Owner changes without a release.
 * Its first panel, "Sessions", holds how long a sign-in lasts (L2-176); the upload sizes and
 * rate limits join it with their slices.
 */
@Component({
  selector: 'pk-limits-page',
  imports: [Button, EmptyState, Icon, LimitRow, PageHead, Panel, RouterLink, SaveBar, Skeleton],
  providers: [AdminLimitsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './limits.page.html',
})
export class LimitsPage {
  protected readonly store = inject(AdminLimitsStore);
  private readonly api = inject(ADMIN_PLATFORM_API);
  private readonly session = inject(AdminSessionStore);
  private readonly dialog = inject(Dialog);
  private readonly toaster = inject(Toaster);

  protected readonly sessionsSub = 'How long a person stays signed in on a device they keep using.';

  /** Why the signed-in admin cannot change limits: Support and Viewer (L2-176 AC7). */
  protected readonly blocked = computed(() => this.session.blockedReason('ChangeLimits'));

  protected readonly sub = computed(() => (this.blocked() ? READ_ONLY_SUB : SUB));

  /** The "Sessions" panel's rows from the draft: name, help, field and error (L2-176 AC3, AC4). */
  protected readonly sessions = computed(() => {
    const draft = this.store.draft();
    if (!draft) return null;
    const canChange = !this.blocked();
    return {
      draft,
      rows: draft.saved.sessions.map((row) => ({
        limit: row.limit,
        name: limitName(row.limit),
        help: limitHelp(row, canChange),
        unit: row.unit,
        error: draft.error(row.limit),
        fields: [{ key: row.limit, value: draft.value(row.limit), numeric: true }] as LimitField[],
      })),
    };
  });

  constructor() {
    this.store.load();
  }

  protected edit(change: LimitFieldChange): void {
    this.store.edit(change.key as LimitKeyId, change.value);
  }

  /** "Save new limits?" with each change and a reason; the saved limits are the new start. */
  protected save(): void {
    const draft = this.store.draft();
    if (!draft?.valid || draft.unsaved === 0) return;
    const changes = draft.changes;
    const request = draft.request();
    this.dialog
      .open<AdminLimits, NotificationActionData<AdminLimits>>(
        NotificationActionDialog<AdminLimits>,
        {
          data: {
            text: SAVE_LIMITS_DIALOG,
            danger: false,
            changes,
            send: (reason) => this.api.changeLimits(request, reason),
          },
          ariaLabelledBy: 'dlg-title',
          ariaDescribedBy: 'dlg-desc',
          // Focus starts in the reason (L2-087 AC1).
          autoFocus: 'textarea',
          // pk-dialog draws its own backdrop, as the mocks do.
          hasBackdrop: false,
          ariaModal: true,
        },
      )
      .closed.subscribe((saved) => {
        if (!saved) return;
        this.store.saved(saved);
        this.toaster.show('success', ...limitsSavedToast(changes.map((c) => c.name)));
      });
  }
}
