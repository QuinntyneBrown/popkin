import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from './toaster';

describe('Toaster', () => {
  let toaster: Toaster;
  const shown = () => toaster.toasts().map((toast) => toast.heading);

  beforeEach(() => {
    vi.useFakeTimers();
    toaster = TestBed.inject(Toaster);
  });

  afterEach(() => vi.useRealTimers());

  // L2-056 AC7, L2-124 AC2
  it.each(['success', 'info'] as const)('a %s toast leaves after 8 seconds', (variant) => {
    toaster.show(variant, 'Marked done');

    vi.advanceTimersByTime(7_999);
    expect(shown()).toEqual(['Marked done']);
    vi.advanceTimersByTime(1);
    expect(shown()).toEqual([]);
  });

  // L2-124 AC3
  it.each(['warning', 'danger'] as const)('a %s toast stays until dismissed', (variant) => {
    toaster.show(variant, 'We couldn’t save that follow-up');

    vi.advanceTimersByTime(60_000);
    expect(shown()).toEqual(['We couldn’t save that follow-up']);
  });

  // L2-124 AC2
  it('waits while it is held', () => {
    toaster.show('success', 'Marked done');
    const id = toaster.toasts()[0].id;
    vi.advanceTimersByTime(5_000);

    toaster.hold(id);
    vi.advanceTimersByTime(30_000);

    expect(shown()).toEqual(['Marked done']);
  });

  // L2-124 AC2
  it('leaves 8 seconds after it is released', () => {
    toaster.show('success', 'Marked done');
    const id = toaster.toasts()[0].id;
    toaster.hold(id);
    vi.advanceTimersByTime(30_000);

    toaster.release(id);
    vi.advanceTimersByTime(7_999);
    expect(shown()).toEqual(['Marked done']);
    vi.advanceTimersByTime(1);
    expect(shown()).toEqual([]);
  });

  it('holding a toast that stays changes nothing', () => {
    toaster.show('danger', 'We couldn’t save that follow-up');
    const id = toaster.toasts()[0].id;

    toaster.hold(id);
    toaster.release(id);
    vi.advanceTimersByTime(60_000);

    expect(shown()).toEqual(['We couldn’t save that follow-up']);
  });
});
