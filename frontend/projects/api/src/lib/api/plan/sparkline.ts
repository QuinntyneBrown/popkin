/** The sprint chip's sparkline in its 44 × 22 box (L2-068 AC7). */
export interface SparklineView {
  /** The points left at the end of each day so far, as an SVG path. */
  line: string;
  /** The ideal line, from the start points on the first day to 0 on the last. */
  ideal: { y1: number; y2: number };
}

const width = 44;
const height = 22;

/**
 * The sparkline of the points left over the sprint: each day so far across the sprint's
 * `sprintDays`, up to the largest points left rounded up to a multiple of 5, as the burn-down's
 * chart does.
 */
export function sparklineOf(days: readonly number[], sprintDays: number): SparklineView {
  const top = Math.max(5, Math.ceil(Math.max(0, ...days) / 5) * 5);
  const step = width / Math.max(1, sprintDays - 1);
  const y = (points: number) => height * (1 - points / top);
  const line = days
    .map((points, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${y(points).toFixed(1)}`)
    .join(' ');
  return { line, ideal: { y1: Number(y(days[0] ?? 0).toFixed(1)), y2: height } };
}
