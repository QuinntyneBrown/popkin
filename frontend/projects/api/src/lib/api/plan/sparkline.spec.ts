import { describe, expect, it } from 'vitest';
import { sparklineOf } from './sparkline';

// L2-068 AC7: the sprint chip's sparkline, in a 44 × 22 box over the sprint's 28 days.
describe('sparklineOf', () => {
  const days = [32, 32, 32, 29, 29, 28, 28, 28, 31, 29, 29, 27, 26, 24];

  it('draws the points left so far as the mocks do, up to 35 for 32 points', () => {
    const sparkline = sparklineOf(days, 28);

    expect(sparkline.line).toBe(
      'M0.0,1.9 L1.6,1.9 L3.3,1.9 L4.9,3.8 L6.5,3.8 L8.1,4.4 L9.8,4.4 L11.4,4.4 L13.0,2.5 ' +
        'L14.7,3.8 L16.3,3.8 L17.9,5.0 L19.6,5.7 L21.2,6.9',
    );
  });

  it('runs the ideal from the start points on the first day to zero on the last', () => {
    expect(sparklineOf(days, 28).ideal).toEqual({ y1: 1.9, y2: 22 });
  });

  it('keeps the top at 5 or more, so a sprint of no points still draws flat on zero', () => {
    expect(sparklineOf([0], 28)).toEqual({ line: 'M0.0,22.0', ideal: { y1: 22, y2: 22 } });
    expect(sparklineOf([3, 2], 28).ideal.y1).toBe(8.8);
  });

  it('spreads a one-day sprint across the box', () => {
    expect(sparklineOf([4, 2], 2).line).toBe('M0.0,4.4 L44.0,13.2');
  });
});
