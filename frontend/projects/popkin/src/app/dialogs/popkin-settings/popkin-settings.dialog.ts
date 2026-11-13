import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogFrame, MenuItem, MenuList } from 'components';

export interface PopkinSettingsData {
  accent: string;
  /** The Popkin's name names the dialog. */
  name: string;
  /** The Host may wrap it up. */
  host: boolean;
}

export type PopkinSetting = 'invite' | 'wrap-up';

/**
 * Popkin settings (L2-020 AC1, AC2): "Invite people" for every member and "Wrap up" for the
 * Host. It closes with the one chosen. Journeys 16 and 18 add the rest.
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
