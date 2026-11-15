import { describe, expect, it } from 'vitest';
import { trendChartOf } from './trend-chart';

/** Fourteen days, as on Dashboard's "People active each day", 1 to 14 Jul. */
const days = (values: number[]) => values.map((value) => ({ value }));

describe('trendChartOf (docs/design-system/components/charts.html)', () => {
  it('draws three dashed lines at the quarters between the top and the axis', () => {
    expect(trendChartOf([{ value: 1 }], 220)).toMatchObject({
      viewBox: '0 0 600 220',
      axis: 194,
      grid: [148.5, 103, 57.5],
    });
    expect(trendChartOf([{ value: 1 }], 240)).toMatchObject({
      axis: 214,
      grid: [163.5, 113, 62.5],
    });
  });

  it('spreads the points from 8 to 592 and scales the highest to 1.12 of the plot', () => {
    const chart = trendChartOf([{ value: 0 }, { value: 100 }], 220);

    expect(chart.line).toBe('M8.0,194.0 L592.0,31.5');
    expect(chart.area).toBe('M8.0,194.0 L592.0,31.5 L592.0,194 L8.0,194 Z');
  });

  it('marks the latest point with a dot', () => {
    const chart = trendChartOf(
      days([8000, 8100, 8050, 8300, 9000, 9200, 8100, 8150, 8250, 8300, 8500, 9300, 13020, 9610]),
      220,
    );

    // The mock's latest, 9,610 under a peak of 13,020.
    expect(chart.dot).toEqual({ x: 592, y: 74.1 });
  });

  it('anchors the first label at its start, the last at its end and the rest at their middle', () => {
    const chart = trendChartOf(
      [
        { value: 1, label: '1 Jul' },
        { value: 2 },
        { value: 3, label: '3' },
        { value: 4, label: '4 Jul' },
      ],
      220,
    );

    expect(chart.labels).toEqual([
      { x: 8, y: 214, text: '1 Jul', anchor: 'start' },
      { x: 397.3, y: 214, text: '3', anchor: 'middle' },
      { x: 592, y: 214, text: '4 Jul', anchor: 'end' },
    ]);
  });

  it('lays a series of zeros along the axis', () => {
    expect(trendChartOf([{ value: 0 }, { value: 0 }], 220).line).toBe('M8.0,194.0 L592.0,194.0');
  });

  it('puts a single point at the start', () => {
    expect(trendChartOf([{ value: 5 }], 220).dot).toEqual({ x: 8, y: 31.5 });
  });
});
