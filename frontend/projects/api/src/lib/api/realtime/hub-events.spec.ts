import { describe, expect, it } from 'vitest';
import { reconnectDelay } from './hub-events';

describe('reconnectDelay', () => {
  it.each([
    [0, 0],
    [1, 2_000],
    [2, 10_000],
    [3, 30_000],
    [4, 30_000],
    [200, 30_000],
  ])('after %i tries waits %i ms', (tries, wait) => {
    expect(reconnectDelay(tries)).toBe(wait);
  });
});
