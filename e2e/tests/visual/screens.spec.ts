import { BASELINE, expect, test } from '../../fixtures/pk-test';
import { screenStates } from '../../fixtures/screens';

/**
 * Visual parity with docs/mocks, region by region (ADR 0003). A sweep: only `npm run sweeps`
 * runs it, by hand (ADR 0006).
 */
const widths = [360, 768, 1280] as const;
const themes = ['light', 'dark'] as const;

for (const state of screenStates) {
  for (const width of widths) {
    for (const theme of themes) {
      test(`${state.key} ${width} ${theme}`, async ({ page, pk }) => {
        await page.setViewportSize({ width, height: 1400 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        if (!BASELINE) await state.before?.(page);
        await pk.open(state.key);
        if (!BASELINE) {
          await state.app?.(page);
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        }
        await page.evaluate(() => document.fonts.ready);
        for (const [name, region] of Object.entries(state.regions(page))) {
          await expect(region).toHaveScreenshot(
            `visual/${state.key}/${name}-${width}-${theme}.png`,
          );
        }
      });
    }
  }
}
