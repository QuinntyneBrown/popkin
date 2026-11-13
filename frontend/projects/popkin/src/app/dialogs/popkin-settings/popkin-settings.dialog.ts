import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogFrame, MenuItem, MenuList } from 'components';

export interface PopkinSettingsData {
  accent: string;
  /** The Popkin's name names the dialog. */
  name: string;
  /** The Host may wrap it up; any other member may leave (L2-047 AC3). */
  host: boolean;
}

export type PopkinSetting = 'invite' | 'wrap-up' | 'leave';

/**
 * Popkin settings (L2-020 AC1, AC2): "Invite people" for every member, "Wrap up" for the Host
 * and "Leave this Popkin" for any other member. It closes with the one chosen. Journey 16 adds
 * the rest.
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
