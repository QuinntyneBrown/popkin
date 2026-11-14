import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogFrame, MenuItem, MenuList } from 'components';

export interface PopkinSettingsData {
  accent: string;
  /** The Popkin's name names the dialog. */
  name: string;
  /** The Host may change it and wrap it up; any other member may leave (L2-047 AC3). */
  host: boolean;
  /** When it wraps up, under "Change how long it lasts": "Wraps up Sun, 6 pm". */
  lengthHint: string;
}

export type PopkinSetting = 'edit' | 'length' | 'invite' | 'wrap-up' | 'leave';

/**
 * Popkin settings (L2-020 AC1, AC2): "Edit name and look", "Change how long it lasts",
 * "Invite people" and "Wrap up" for the Host; "Invite people" and "Leave this Popkin" for any
 * other member. It closes with the one chosen.
 */
@Component({
  selector: 'pk-popkin-settings-dialog',
  imports: [DialogFrame, MenuItem, MenuList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './popkin-settings.dialog.html',
})
export class PopkinSettingsDialog {
  protected readonly data = inject<PopkinSettingsData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<PopkinSetting>>(DialogRef);

  protected choose(setting: PopkinSetting): void {
    this.ref.close(setting);
  }
}
