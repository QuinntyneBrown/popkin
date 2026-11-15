/** One day of a series: its value and, where the x axis names it, its label ("1 Jul", "5"). */
export interface TrendPoint {
  value: number;
  label?: string | null;
}

export interface TrendLabel {
  x: number;
  y: number;
  text: string;
  anchor: 'start' | 'middle' | 'end';
}

/** The trend chart's geometry, in the units of its `viewBox`, 600 wide. */
export interface TrendChartView {
  viewBox: string;
  /** The left and right ends of the plot. */
  left: number;
  right: number;
  /** The y of the three dashed lines, bottom first. */
  grid: number[];
  /** The y of the x axis. */
  axis: number;
  /** The series as an SVG path. */
  line: string;
  /** The line closed down to the axis, for its light fill. */
  area: string;
  /** The latest point. */
  dot: { x: number; y: number };
  labels: TrendLabel[];
}

const WIDTH = 600;
const LEFT = 8;
const RIGHT = 592;
const TOP = 12;
/** Room under the axis for the labels. */
const UNDER = 26;
/** The highest value reaches this share of the plot's height over the axis' 1. */
const HEADROOM = 1.12;

/**
 * The trend chart of one series over days (docs/design-system/components/charts.html), as the
 * admin app's Dashboard and Metrics draw it: the days spread evenly from 8 to 592, the axis 26
 * above the bottom with the labels under it, three dashed lines at its quarters, and the y scale
 * from 0 to 1.12 times the highest value so the peak never touches the top.
 */
export function trendChartOf(points: readonly TrendPoint[], height: number): TrendChartView {
  const axis = height - UNDER;
  const band = (axis - TOP) / 4;
  const highest = Math.max(0, ...points.map((p) => p.value)) * HEADROOM || 1;
  const step = points.length > 1 ? (RIGHT - LEFT) / (points.length - 1) : 0;
  const x = (i: number) => LEFT + i * step;
  const y = (value: number) => axis - (value / highest) * (axis - TOP);

  const coords = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`);
  const line = coords.map((c, i) => (i === 0 ? 'M' : 'L') + c).join(' ');
  const last = points.length - 1;
  const end = x(Math.max(last, 0)).toFixed(1);

  return {
    viewBox: `0 0 ${WIDTH} ${height}`,
    left: LEFT,
    right: RIGHT,
    grid: [1, 2, 3].map((k) => round(axis - k * band)),
    axis,
    line,
    area: `${line} L${end},${axis} L${LEFT.toFixed(1)},${axis} Z`,
    dot: { x: round(x(Math.max(last, 0))), y: round(y(points[Math.max(last, 0)]?.value ?? 0)) },
    labels: points.flatMap((p, i) =>
      p.label
        ? [
            {
              x: round(x(i)),
              y: height - 6,
              text: p.label,
              anchor:
                i === 0 ? ('start' as const) : i === last ? ('end' as const) : ('middle' as const),
            },
          ]
        : [],
    ),
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
