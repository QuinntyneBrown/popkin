import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Undo bar (docs/design-system/components/undo-bar.html, `undo-bar`): a change that can be taken
 * back, in ink above the settings it changed: what happened, one action that undoes it and
 * "Dismiss". It is a status, so a screen reader hears it without moving focus. It stays until
 * acted on, dismissed or the screen is left (the 8-second close is undecided, gap 136).
 */
@Component({
  selector: 'div[pk-undo-bar]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './undo-bar.html',
  styleUrl: './undo-bar.scss',
  host: { class: 'undo-bar', role: 'status' },
})
export class UndoBar {
  /** What happened: "You’re unsubscribed from all Popkin email. …" */
  readonly text = input.required<string>();
  /** The action that takes it back: "Turn email back on", "Undo". */
  readonly action = input.required<string>();
  readonly acted = output<void>();
  readonly dismissed = output<void>();
}
