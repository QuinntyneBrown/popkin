import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, Signal, inject, signal } from '@angular/core';

/** "Match my device", "Light" or "Dark" (L2-048 AC4). */
export type ThemeChoice = 'device' | 'light' | 'dark';

/**
 * The theme chosen on this device. It belongs to the device, not to the account, so signing out
 * keeps it. `device` lets the tokens follow `prefers-color-scheme` (L2-059 AC1).
 */
export interface ThemePreferences {
  readonly current: Signal<ThemeChoice>;
  /** Draws the remembered choice; the app calls it once, before the first screen. */
  apply(): void;
  /** Takes the choice at once and remembers it. */
  set(choice: ThemeChoice): void;
}

export const THEME_PREFERENCES = new InjectionToken<ThemePreferences>('ThemePreferences');

const KEY = 'popkin.theme';
const choices: readonly ThemeChoice[] = ['device', 'light', 'dark'];

/** The choice in the browser's local storage, drawn as `data-theme` on `html`. */
@Injectable()
export class LocalStorageThemePreferences implements ThemePreferences {
  private readonly document = inject(DOCUMENT);
  private readonly state = signal<ThemeChoice>('device');

  readonly current = this.state.asReadonly();

  apply(): void {
    this.draw(this.read());
  }

  set(choice: ThemeChoice): void {
    try {
      this.document.defaultView?.localStorage.setItem(KEY, choice);
    } catch {
      // A blocked store still takes the choice for as long as the page is open.
    }
    this.draw(choice);
  }

  private read(): ThemeChoice {
    try {
      const saved = this.document.defaultView?.localStorage.getItem(KEY);
      return choices.find((choice) => choice === saved) ?? 'device';
    } catch {
      return 'device';
    }
  }

  private draw(choice: ThemeChoice): void {
    this.state.set(choice);
    const html = this.document.documentElement;
    if (choice === 'device') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', choice);
  }
}
