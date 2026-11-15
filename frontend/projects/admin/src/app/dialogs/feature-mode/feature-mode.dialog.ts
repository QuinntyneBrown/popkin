import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  ADMIN_PLATFORM_API,
  ActionDialogState,
  AdminFeature,
  FEATURE_SAVE_FAILED,
  FeatureMode,
  REASON_MAX_LENGTH,
  modeDialogText,
} from 'api';
import { Alert, Button, DialogFrame, Textarea } from 'components';

export interface FeatureModeData {
  feature: AdminFeature;
  mode: FeatureMode;
}

/**
 * "Turn Schedules off for everyone?", "Turn Schedules on for everyone?" and "Limit Plan to
 * chosen Popkins?" (L2-076 AC2–AC4): what the change does, with an optional reason for the audit
 * log (L2-087 AC3). It closes with the feature as saved; a failure keeps it open with the reason
 * as typed (L2-076 AC8).
 */
@Component({
  selector: 'pk-feature-mode-dialog',
  imports: [Alert, Button, DialogFrame, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feature-mode.dialog.html',
})
export class FeatureModeDialog {
  protected readonly data = inject<FeatureModeData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<AdminFeature>>(DialogRef);
  private readonly api = inject(ADMIN_PLATFORM_API);

  protected readonly state = new ActionDialogState('Optional');
  protected readonly reason = signal('');
  protected readonly maxLength = REASON_MAX_LENGTH;
  protected readonly failed = FEATURE_SAVE_FAILED;
  protected readonly text = modeDialogText(
    this.data.feature.feature,
    this.data.mode,
    this.data.feature.chosen.map((p) => p.name),
  );
  protected readonly off = this.data.mode === 'Off';
  protected readonly busy = computed(() => this.state.status() === 'busy');
  protected readonly action = computed(() =>
    this.off ? (this.busy() ? 'Turning off…' : 'Turn it off') : this.busy() ? 'Applying…' : 'Apply',
  );

  protected async confirm(): Promise<void> {
    this.ref.disableClose = true;
    const saved = await this.state.confirm(this.reason(), (reason) =>
      this.api.changeMode(this.data.feature.feature, this.data.mode, reason),
    );
    this.ref.disableClose = false;
    if (saved) this.ref.close(saved);
  }

  protected cancel(): void {
    if (!this.busy()) this.ref.close();
  }
}
