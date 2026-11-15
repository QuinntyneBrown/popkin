import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ChartLegend, LegendKey } from '../chart-legend/chart-legend';

/** A label on an axis or over the plot, placed by percentage of the plot. */
export interface BurnChartMark {
  label: string;
  left?: number;
  top?: number;
}

/** A straight line of the chart, in its 100 × 100 box. */
export interface BurnChartLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** What the chart draws; `burnChartOf` in the `api` library works it out. */
export interface BurnChartGeometry {
  yTicks: { label: string; top: number }[];
  line: string;
  ideal: BurnChartLine;
  forecast: BurnChartLine | null;
  after: { x: number; width: number };
  today: { left: number; top: number; label: string };
  rises: { left: number; top: number; label: string }[];
  xTicks: { label: string; left: number; today: boolean }[];
}

/**
 * Burn chart (docs/design-system/components/plan.html): the points left at the end of each day
 * as a line in the Popkin's colour, the ideal line dashed, the forecast dotted, today's dot and
 * "{n} left", "+{n}" over each day the line rose, and the shaded days "After the sprint"
 * (L2-071 AC4). The drawing is hidden from assistive technology; `text` says it all (AC5). Its
 * marks are drawn in a 100 × 100 box stretched to the plot, so it fills its width at any size.
 */
@Component({
  selector: 'figure[pk-burn-chart]',
  imports: [ChartLegend],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './burn-chart.html',
  styleUrl: './burn-chart.scss',
  host: { class: 'burn-chart', 'aria-label': 'Points left by day' },
})
export class BurnChart {
  readonly chart = input.required<BurnChartGeometry>();
  /** The chart as text: the status, the forecast and each day's points left. */
  readonly text = input.required<string>();

  protected legend(chart: BurnChartGeometry): LegendKey[] {
    const keys: LegendKey[] = [
      { label: 'Points left', swatch: 'line' },
      { label: 'Ideal line', swatch: 'ideal' },
    ];
    return chart.forecast ? [...keys, { label: 'At this week’s pace', swatch: 'forecast' }] : keys;
  }
}
