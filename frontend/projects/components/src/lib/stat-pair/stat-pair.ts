import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Stat pair (docs/design-system/components/stat.html, `stat-pair`): two totals side by side,
 * under a hairline that parts them from what is above, a `div[pk-stat]` each. It is a
 * description list.
 */
@Component({
  selector: 'dl[pk-stat-pair]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stat-pair.html',
  styleUrl: './stat-pair.scss',
  host: { class: 'stat-pair' },
})
export class StatPair {}
