import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  ALWAYS_THERE,
  ChangeFeaturesRequest,
  FEATURE_TEXT,
  FeatureChoiceView,
  POPKINS_API,
  PopkinFeature,
  PopkinFeaturesView,
} from 'api';
import { Alert, Button, DialogFrame, SettingRow, Stack } from 'components';

export interface PopkinFeaturesData {
  popkinId: string;
  accent: string;
  /** The features the admin app offers the Popkin, in the Host's choice (L2-153 AC2). */
  choices: FeatureChoiceView[];
}

/**
 * "Features" (L2-153): the Host switches the offered features on and off. It closes with the
 * saved switches, or with nothing on Cancel; a failure keeps it open as the Host left it (AC6).
 */
@Component({
  selector: 'pk-popkin-features-dialog',
  imports: [Alert, Button, DialogFrame, SettingRow, Stack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './popkin-features.dialog.html',
})
export class PopkinFeaturesDialog {
  protected readonly data = inject<PopkinFeaturesData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<PopkinFeaturesView>>(DialogRef);
  private readonly api = inject(POPKINS_API);

  protected readonly description = ALWAYS_THERE;
  protected readonly choices = signal(
    this.data.choices.map((choice) => ({ ...choice, ...FEATURE_TEXT[choice.feature] })),
  );
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected toggle(feature: PopkinFeature, on: boolean): void {
    this.choices.update((choices) =>
      choices.map((c) => (c.feature === feature ? { ...c, on } : c)),
    );
  }

  /** "Save" is sent once; while it goes, it reads "Saving…" (AC3). */
  protected save(): void {
    if (this.busy()) return;
    const request: ChangeFeaturesRequest = {};
    for (const choice of this.choices()) {
      if (choice.feature === 'Plan') request.plan = choice.on;
      else request.schedules = choice.on;
    }
    this.busy.set(true);
    this.failed.set(false);
    this.api.changeFeatures(this.data.popkinId, request).subscribe({
      next: (saved) => this.ref.close(saved),
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }

  protected cancel(): void {
    this.ref.close();
  }
}
