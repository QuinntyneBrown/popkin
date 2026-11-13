import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Stat (docs/design-system/components/stat.html): a big number with a short label under it, one
 * of a `dl[pk-stat-pair]`. The value is written as it reads, thousands separators included
 * ("1,286"); the label is lower case ("messages sent").
 */
@Component({
  selector: 'div[pk-stat]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stat.html',
  styleUrl: './stat.scss',
  host: { class: 'stat' },
})
export class Stat {
  readonly value = input.required<string>();
  readonly label = input.required<string>();
}
