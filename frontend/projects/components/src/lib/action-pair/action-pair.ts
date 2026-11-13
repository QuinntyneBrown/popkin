import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Action pair (docs/design-system/components/action-pair.html): two actions of equal standing,
 * projected as block buttons. They are stacked on a phone and side by side wherever their
 * column is wide enough for two: from 640 px, stacked again from 768 px, where the split screen
 * halves the column, and side by side from 1280 px (L2-058).
 */
@Component({
  selector: 'div[pk-action-pair]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './action-pair.html',
  styleUrl: './action-pair.scss',
  host: { class: 'action-pair' },
})
export class ActionPair {}
