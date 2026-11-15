import { describe, expect, it } from 'vitest';
import { BurnDownView } from '../../models/plan';
import { burnChartOf } from './burn-chart';

/** The mocks' sprint, Aug 30 to Sep 26 2026, with the points left at the end of each day. */
function sprintOf(pointsLeft: number[], more: Partial<BurnDownView> = {}): BurnDownView {
  return {
    sprint: { name: 'Planning sprint', firstDay: '2026-08-30', lastDay: '2026-09-26', daysLeft: 0 },
    startPoints: pointsLeft[0],
    pointsLeft: pointsLeft[pointsLeft.length - 1],
    behind: 0,
    forecast: null,
    days: pointsLeft.map((points, i) => ({
      day: new Date(Date.UTC(2026, 7, 30 + i)).toISOString().slice(0, 10),
      pointsLeft: points,
    })),
    biggest: [],
    ...more,
  };
}

const theMocks = [32, 32, 32, 29, 29, 28, 28, 28, 31, 29, 29, 27, 26, 24];

describe('burnChartOf (L2-071 AC4)', () => {
  const late = sprintOf(theMocks, { forecast: { kind: 'Late', date: '2026-09-30', days: 4 } });

  it('runs the y axis to the largest points rounded up to a 5, a tick every 10', () => {
    expect(burnChartOf(late, '2026-09-12').yTicks).toEqual([
      { label: '30', top: 14.29 },
      { label: '20', top: 42.86 },
      { label: '10', top: 71.43 },
      { label: '0', top: 100 },
    ]);
  });

  it('runs the x axis a day past the forecast, or three past the last day', () => {
    const chart = burnChartOf(late, '2026-09-12');

    // Sep 26 is day 27 of 32.
    expect(chart.after).toEqual({ x: 84.38, width: 15.62 });
    expect(chart.ideal).toEqual({ x1: 0, y1: 8.57, x2: 84.38, y2: 100 });
    expect(chart.forecast).toEqual({ x1: 40.63, y1: 31.43, x2: 96.88, y2: 100 });
  });

  it('joins each day, marks today and each day the line rose', () => {
    const chart = burnChartOf(late, '2026-09-12');

    expect(chart.line.startsWith('M0,8.57 L3.13,8.57 L6.25,8.57 L9.38,17.14')).toBe(true);
    expect(chart.line.endsWith('L40.63,31.43')).toBe(true);
    expect(chart.today).toEqual({ left: 40.63, top: 31.43, label: '24 left' });
    expect(chart.rises).toEqual([{ left: 25, top: 11.43, label: '+3' }]);
  });

  it('labels the first day, each seventh day, today and the last day, none beside today', () => {
    expect(burnChartOf(late, '2026-09-12').xTicks).toEqual([
      { label: 'Aug 30', left: 0, today: false },
      { label: 'Sep 6', left: 21.88, today: false },
      { label: 'Today', left: 40.63, today: true },
      { label: 'Sep 20', left: 65.63, today: false },
      { label: 'Sep 26', left: 84.38, today: false },
    ]);
  });

  it('draws no forecast once the plan is done, and ends three days after the last day', () => {
    const done = sprintOf([...theMocks, 20, 14, 9, 4, 0], {
      forecast: { kind: 'Done', date: '2026-09-17', days: 9 },
    });

    const chart = burnChartOf(done, '2026-09-17');

    expect(chart.forecast).toBeNull();
    expect(chart.after).toEqual({ x: 90, width: 10 });
    expect(chart.today).toEqual({ left: 60, top: 100, label: '0 left' });
    expect(chart.xTicks.map((t) => t.label)).toEqual([
      'Aug 30',
      'Sep 6',
      'Sep 13',
      'Today',
      'Sep 26',
    ]);
  });

  it('draws no forecast without progress', () => {
    const stuck = sprintOf([10, 10], { forecast: { kind: 'NoProgress', date: null, days: 0 } });

    expect(burnChartOf(stuck, '2026-08-31').forecast).toBeNull();
  });
});
