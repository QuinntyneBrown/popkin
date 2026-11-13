import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageThemePreferences } from './theme-preferences';

describe('LocalStorageThemePreferences', () => {
  const html = () => document.documentElement;

  function preferences(): LocalStorageThemePreferences {
    TestBed.configureTestingModule({
      providers: [LocalStorageThemePreferences, { provide: DOCUMENT, useValue: document }],
    });
    return TestBed.inject(LocalStorageThemePreferences);
  }

  beforeEach(() => {
    localStorage.clear();
    html().removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('follows the device when nothing was chosen', () => {
    const theme = preferences();

    theme.apply();

    expect(theme.current()).toBe('device');
    expect(html().hasAttribute('data-theme')).toBe(false);
  });

  it('takes a choice at once and remembers it on the device (L2-048 AC4)', () => {
    preferences().set('dark');

    expect(html().getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('popkin.theme')).toBe('dark');
  });

  it('applies the remembered choice when the app starts', () => {
    localStorage.setItem('popkin.theme', 'light');
    const theme = preferences();

    theme.apply();

    expect(theme.current()).toBe('light');
    expect(html().getAttribute('data-theme')).toBe('light');
  });

  it('"Match my device" removes the choice, so the device decides', () => {
    const theme = preferences();
    theme.set('dark');

    theme.set('device');

    expect(theme.current()).toBe('device');
    expect(html().hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem('popkin.theme')).toBe('device');
  });

  it('reads an unknown value as following the device', () => {
    localStorage.setItem('popkin.theme', 'purple');
    const theme = preferences();

    theme.apply();

    expect(theme.current()).toBe('device');
  });

  it('still takes a choice when the storage is blocked (L2-059 AC1)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const theme = preferences();

    theme.apply();
    theme.set('dark');

    expect(theme.current()).toBe('dark');
    expect(html().getAttribute('data-theme')).toBe('dark');
  });
});
