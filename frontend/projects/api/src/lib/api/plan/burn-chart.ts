import { BurnDownView } from '../../models/plan';
import { addDays } from '../schedule/schedule-weeks';
import { sprintDayLabel, daysBetween } from './plan-text';

/** A label on an axis, placed by percentage of the plot. */
export interface BurnTick {
  label: string;
  top: number;
}

export interface BurnXTick {
  label: string;
  left: number;
  today: boolean;
}

/** A mark over the plot: today's dot and label, or "+3" over a day the line rose. */
export interface BurnMark {
  left: number;
  top: number;
  label: string;
}

export interface BurnLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * The burn-down chart's geometry (L2-071 AC4), in a 100 × 100 box stretched to the plot: every
 * number is a percentage, so nothing reads the viewport's width.
 */
export interface BurnChartView {
  yTicks: BurnTick[];
  /** The points left at the end of each day so far, as an SVG path. */
  line: string;
  ideal: BurnLine;
  /** From today's points left to 0 on the forecast's date: only while the plan is late, early or due on the last day. */
  forecast: BurnLine | null;
  /** The shaded days after the sprint's last day. */
  after: { x: number; width: number };
  today: BurnMark;
  rises: BurnMark[];
  xTicks: BurnXTick[];
}

/** The days after the last day the x axis runs at least. */
const AFTER_DAYS = 3;
/** A date label closer to "Today" than this many days is left out. */
const NEAR_TODAY = 3;

/**
 * The chart of a burn-down (docs/detailed-designs/plan/burn-down): the y axis from 0 to the most
 * points rounded up to a multiple of 5, a tick every 10; the x axis from the first day to three
 * days after the last day, or one after the forecast's date when that is later.
 */
export function burnChartOf(view: BurnDownView, today: string): BurnChartView {
  const sprint = view.sprint!;
  const lastIndex = daysBetween(sprint.firstDay, sprint.lastDay);
  const todayIndex = daysBetween(sprint.firstDay, today);
  const finishing =
    view.forecast && view.forecast.date && view.forecast.kind !== 'NoProgress'
      ? daysBetween(sprint.firstDay, view.forecast.date)
      : null;
  const xMax = Math.max(lastIndex + AFTER_DAYS, (finishing ?? 0) + 1, todayIndex + 1);
  const highest = Math.max(
    view.startPoints,
    view.pointsLeft,
    ...view.days.map((d) => d.pointsLeft),
  );
  const yMax = Math.max(5, Math.ceil(highest / 5) * 5);
  const x = (index: number) => round((index / xMax) * 100);
  const y = (points: number) => round((1 - points / yMax) * 100);

  const points = view.days.map((d, i) => ({ x: x(i), y: y(d.pointsLeft) }));
  const rises = view.days.flatMap((d, i) =>
    i > 0 && d.pointsLeft > view.days[i - 1].pointsLeft
      ? [
          {
            left: x(i),
            top: y(d.pointsLeft),
            label: `+${d.pointsLeft - view.days[i - 1].pointsLeft}`,
          },
        ]
      : [],
  );
  const drawsForecast = finishing !== null && view.forecast!.kind !== 'Done' && view.pointsLeft > 0;

  return {
    yTicks: Array.from({ length: Math.floor(yMax / 10) + 1 }, (_, i) => i * 10)
      .reverse()
      .map((value) => ({ label: String(value), top: y(value) })),
    line: points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' '),
    ideal: { x1: 0, y1: y(view.startPoints), x2: x(lastIndex), y2: 100 },
    forecast: drawsForecast
      ? { x1: x(todayIndex), y1: y(view.pointsLeft), x2: x(finishing), y2: 100 }
      : null,
    after: { x: x(lastIndex), width: round(100 - x(lastIndex)) },
    today: { left: x(todayIndex), top: y(view.pointsLeft), label: `${view.pointsLeft} left` },
    rises,
    xTicks: xTicksOf(sprint.firstDay, lastIndex, todayIndex, x),
  };
}

/** The first day, each seventh day after it, "Today" and the last day; none beside "Today". */
function xTicksOf(
  firstDay: string,
  lastIndex: number,
  todayIndex: number,
  x: (index: number) => number,
): BurnXTick[] {
  const indexes = new Set<number>();
  for (let i = 0; i < lastIndex; i += 7) indexes.add(i);
  indexes.add(lastIndex);
  return [...indexes, todayIndex]
    .filter((i) => i === todayIndex || Math.abs(i - todayIndex) > NEAR_TODAY)
    .filter((i, n, all) => all.indexOf(i) === n)
    .sort((a, b) => a - b)
    .map((i) => ({
      label: i === todayIndex ? 'Today' : sprintDayLabel(addDays(firstDay, i)),
      left: x(i),
      today: i === todayIndex,
    }));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
