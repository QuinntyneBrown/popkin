import type { Locator, Page } from '@playwright/test';
import { BASELINE, expect, test } from './pk-test';
import type { RouteKey } from './routes';

/**
 * ADR 0008: a component's region in the app is compared with the same region of the mock, at
 * 360 px and 1280 px, in the light and the dark theme. `npm run parity` first renders the
 * baselines from docs/mocks (PK_PARITY=mocks), then compares the app with them (PK_PARITY=app).
 */
export interface ParityCase {
  /** The screen state that shows the variant. */
  key: RouteKey;
  /** A short name for the variant; defaults to the route key. */
  name?: string;
  /** The component's region, from the screen's page object. */
  region: (page: Page) => Locator;
  /** Brings both targets into the state, where opening it is not enough (focus a control). */
  prepare?: (page: Page) => Promise<void>;
  /** Brings the app into the state the mock draws statically (typed values, a submitted form). */
  app?: (page: Page) => Promise<void>;
}

const widths = [360, 1280] as const;
const themes = ['light', 'dark'] as const;

export function parity(component: string, cases: ParityCase[]): void {
  test.describe(`${component} matches the mock`, () => {
    for (const parityCase of cases) {
      for (const width of widths) {
        for (const theme of themes) {
          const name = `${parityCase.name ?? parityCase.key}-${width}-${theme}`;
          test(name, async ({ page, pk }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
            await pk.open(parityCase.key);
            if (!BASELINE && parityCase.app) {
              await parityCase.app(page);
              // The mock draws no focus; the app's last interaction leaves one.
              await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
            }
            await parityCase.prepare?.(page);
            await page.evaluate(() => document.fonts.ready);
            await expect(parityCase.region(page)).toHaveScreenshot(
              `parity/${component}/${name}.png`,
            );
          });
        }
      }
    }
  });
}
