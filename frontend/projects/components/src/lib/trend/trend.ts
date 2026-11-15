import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The geometry `trendChartOf` in the `api` library works out, in the units of `viewBox`. */
export interface TrendGeometry {
  viewBox: string;
  left: number;
  right: number;
  grid: readonly number[];
  axis: number;
  line: string;
  area: string;
  dot: { x: number; y: number };
  labels: readonly { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end' }[];
}

/**
 * Trend chart (docs/design-system/components/charts.html): one series over days on Dashboard and
 * Metrics, a solid line over a light area with the latest day dotted. It is one image: `label`
 * names it with its latest value ("People active each day, latest 9,610"). `bad` draws a series
 * where up is bad, such as errors, in the danger colour.
 */
@Component({
  selector: 'svg[pk-trend]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trend.html',
  styleUrl: './trend.scss',
  host: {
    class: 'trend',
    role: 'img',
    '[attr.viewBox]': 'chart().viewBox',
    '[attr.aria-label]': 'label()',
    '[class.trend--bad]': 'bad()',
  },
})
export class Trend {
  readonly chart = input.required<TrendGeometry>();
  readonly label = input.required<string>();
  readonly bad = input(false);
}
