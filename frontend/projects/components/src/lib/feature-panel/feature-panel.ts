import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { IconButton } from '../icon-button/icon-button';
import { Icon } from '../icon/icon';
import { PopkinTile } from '../popkin-tile/popkin-tile';
import { Skeleton } from '../skeleton/skeleton';
import { SegmentedControl, SegmentedOption } from '../segmented-control/segmented-control';

export type FeaturePanelMode = 'Off' | 'Chosen' | 'Everyone';

export interface FeaturePanelPopkin {
  id: string;
  name: string;
  emoji: string;
  /** The Popkin's accent, for its tile: "teal". */
  accent: string;
}

/** A mode chosen in the panel; `revert` puts the choice back when its dialog is cancelled. */
export interface FeatureModeChoice {
  mode: FeaturePanelMode;
  revert(): void;
}

const MODES: SegmentedOption[] = [
  { value: 'Off', label: 'Off' },
  { value: 'Chosen', label: 'Chosen Popkins' },
  { value: 'Everyone', label: 'Everyone' },
];

/**
 * Feature panel (docs/design-system/components/feature-panel.html): one feature with how far it
 * reaches, who set it when, and the radio group "Who has {feature}" of Off, Chosen Popkins and
 * Everyone (L2-076 AC1). Under Chosen it lists the chosen Popkins, each removable, and "Add a
 * Popkin" (AC5). The reach says the mode in words, so it is never told by colour alone.
 *
 * It saves nothing: a choice is told as `modeChosen`, whose `revert` puts it back if the
 * consumer's dialog is cancelled. With `disabledReason` every option, "Remove" and "Add a
 * Popkin" stay focusable but switched off, with the reason as their title (L2-076 AC12).
 * Compose it inside `pk-panel` with a body.
 */
@Component({
  selector: 'div[pk-feature-panel]',
  imports: [Icon, IconButton, PopkinTile, SegmentedControl, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feature-panel.html',
  styleUrl: './feature-panel.scss',
  host: { class: 'feature-panel' },
})
export class FeaturePanel {
  readonly name = input('');
  readonly about = input('');
  /** Where it is on, in words: "On in 3 chosen Popkins only." */
  readonly reach = input('');
  /** "Chosen Popkins since 14 Jul, 10:21 by Lena Fischer"; null for a switch never set. */
  readonly since = input<string | null>(null);
  readonly mode = input<FeaturePanelMode>('Off');
  /** While the features load: the panel's shape in skeletons, hidden from assistive technology. */
  readonly loading = input(false);
  readonly chosen = input<readonly FeaturePanelPopkin[]>([]);
  readonly disabledReason = input<string | null>(null);

  readonly modeChosen = output<FeatureModeChoice>();
  readonly removeChosen = output<FeaturePanelPopkin>();
  readonly addChosen = output<void>();

  protected readonly modes = MODES;
  protected readonly shown = linkedSignal<string>(() => this.mode());

  protected choose(value: string): void {
    if (value === this.mode()) return;
    this.modeChosen.emit({
      mode: value as FeaturePanelMode,
      revert: () => this.shown.set(this.mode()),
    });
  }

  protected add(): void {
    if (!this.disabledReason()) this.addChosen.emit();
  }
}
