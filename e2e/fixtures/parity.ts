import type { Locator, Page } from '@playwright/test';
import { BASELINE, expect, test } from './pk-test';
import type { RouteKey } from './routes';

/**
 * ADR 0008: a component's region in the app is compared with the same region of the mock, at
 * 360 px and 1280 px, in the light and the dark theme. `npm run parity` first renders the
 * baselines from docs/mocks (PK_PARITY=mocks), then compares the app with them (PK_PARITY=app).
 */
const widths = [360, 1280] as const;

export interface ParityCase {
  /** The screen state that shows the variant. */
  key: RouteKey;
  /** A short name for the variant; defaults to the route key. */
  name?: string;
  /** The component's region, from the screen's page object. */
  region: (page: Page) => Locator;
  /** Brings both targets into the state, where opening it is not enough (focus a control). */
  prepare?: (page: Page) => Promise<void>;
  /** Prepares the app's page before it opens (stubs, init scripts). */
  before?: (page: Page) => Promise<void>;
  /** Brings the app into the state the mock draws statically (typed values, a submitted form). */
  app?: (page: Page) => Promise<void>;
  /**
   * Moves the region down to the next whole pixel before it is compared. For a row of a thread:
   * the rows above it differ between the mock and the app (the mock draws reactions and photos
   * that later journeys build), so the same row starts at a different fraction of a pixel and
   * the browser rounds its edges differently.
   */
  snap?: boolean;
  /** The widths to compare at, for a component that exists at some only; both by default. */
  widths?: readonly (typeof widths)[number][];
}

const themes = ['light', 'dark'] as const;

export function parity(component: string, cases: ParityCase[]): void {
  test.describe(`${component} matches the mock`, () => {
    for (const parityCase of cases) {
      for (const width of parityCase.widths ?? widths) {
        for (const theme of themes) {
          const name = `${parityCase.name ?? parityCase.key}-${width}-${theme}`;
          test(name, async ({ page, pk }) => {
            // Tall enough that no sticky footer covers a region the screenshot scrolls to.
            await page.setViewportSize({ width, height: 1400 });
            await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
            if (!BASELINE) await parityCase.before?.(page);
            await pk.open(parityCase.key);
            if (!BASELINE && parityCase.app) {
              await parityCase.app(page);
              // The mock draws no focus; the app's last interaction leaves one.
              await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
            }
            await parityCase.prepare?.(page);
            await page.evaluate(() => document.fonts.ready);
            if (parityCase.snap) {
              await parityCase.region(page).evaluate((element: HTMLElement) => {
                const over = element.getBoundingClientRect().top % 1;
                if (over === 0) return;
                // A floating region is placed from its bottom edge; a row, after the row above.
                if (getComputedStyle(element).position === 'absolute') {
                  element.style.bottom = `${over - 1}px`;
                } else {
                  element.style.marginTop = `${1 - over}px`;
                }
              });
            }
            await expect(parityCase.region(page)).toHaveScreenshot(
              `parity/${component}/${name}.png`,
            );
          });
        }
      }
    }
  });
}
