import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One key of a legend: its words and the swatch it explains. */
export interface LegendKey {
  label: string;
  swatch: 'off' | 'tentative' | 'working' | 'tint' | 'card' | 'line' | 'ideal' | 'forecast';
  /** Words after the label in the Popkin's colour: the "7:30 pm" of "All six free from 7:30 pm". */
  emphasis?: string;
}

/**
 * Chart legend (docs/design-system/components/schedule.html): what each fill of a chart or
 * table means. The words say it; the swatch beside them only repeats it. The burn-down's lines
 * (`line`, `ideal` dashed, `forecast` dotted) differ by their strokes, not their colour alone.
 */
@Component({
  selector: 'div[pk-chart-legend], figcaption[pk-chart-legend]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-legend.html',
  styleUrl: './chart-legend.scss',
  host: { class: 'chart-legend' },
})
export class ChartLegend {
  readonly keys = input.required<LegendKey[]>();
}
