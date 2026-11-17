import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DelayedLoading } from './delayed-loading';

describe('DelayedLoading (L2-056 AC1)', () => {
  let loading: DelayedLoading;

  beforeEach(() => {
    vi.useFakeTimers();
    loading = TestBed.runInInjectionContext(() => new DelayedLoading());
  });

  afterEach(() => vi.useRealTimers());

  it('shows nothing while a read is quick', () => {
    loading.begin();
    vi.advanceTimersByTime(299);

    expect(loading.state()).toBe('pending');
  });

  it('says it is loading once 300 ms pass without an answer', () => {
    loading.begin();
    vi.advanceTimersByTime(300);

    expect(loading.state()).toBe('loading');
  });

  it('is ready when the answer comes, and stays so', () => {
    loading.begin();
    loading.ready();
    vi.advanceTimersByTime(1000);

    expect(loading.state()).toBe('ready');
  });

  it('has failed when the read fails, and stays so', () => {
    loading.begin();
    vi.advanceTimersByTime(500);
    loading.failed();
    vi.advanceTimersByTime(1000);

    expect(loading.state()).toBe('error');
  });

  it('starts over when read again', () => {
    loading.begin();
    loading.failed();

    loading.begin();

    expect(loading.state()).toBe('pending');
    vi.advanceTimersByTime(300);
    expect(loading.state()).toBe('loading');
  });

  it('takes another wait where a screen names one', () => {
    const slower = TestBed.runInInjectionContext(() => new DelayedLoading(500));
    slower.begin();
    vi.advanceTimersByTime(300);

    expect(slower.state()).toBe('pending');
  });

  it('stops its timer when its screen is destroyed', () => {
    const injector = Injector.create({ providers: [], parent: TestBed.inject(Injector) });
    const scoped = runInInjectionContext(injector, () => new DelayedLoading());
    scoped.begin();

    (injector as unknown as { destroy(): void }).destroy();
    vi.advanceTimersByTime(300);

    expect(scoped.state()).toBe('pending');
  });
});
