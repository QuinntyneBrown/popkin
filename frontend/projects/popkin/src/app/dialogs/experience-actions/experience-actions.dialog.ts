import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogFrame, MenuItem, MenuList } from 'components';

export interface ExperienceActionsData {
  accent: string;
  /** The experience's title names the dialog. */
  title: string;
  /** Its sharer may edit it. */
  canEdit: boolean;
  /** Its sharer and the Host may delete it. */
  canDelete: boolean;
}

export type ExperienceAction = 'edit' | 'delete';

/**
 * The actions of an experience (L2-040 AC6): "Edit" for its sharer, "Delete" for its sharer
 * and the Host. It closes with the one chosen.
 */
@Component({
  selector: 'pk-experience-actions-dialog',
  imports: [DialogFrame, MenuItem, MenuList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experience-actions.dialog.html',
})
export class ExperienceActionsDialog {
  protected readonly data = inject<ExperienceActionsData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<ExperienceAction>>(DialogRef);

  protected choose(action: ExperienceAction): void {
    this.ref.close(action);
  }
}
