import { expect, test } from '../fixtures/pk-test';
import { screenStates } from '../fixtures/screens';

/**
 * Responsive fit (L2-058 AC1, AC3, L2-057 AC4): at 360 px nothing scrolls sideways and every
 * control is a 44 px target; from 576 px the app is a centred column no wider than 30 rem.
 * A sweep: only `npm run sweeps` runs it (ADR 0006).
 */
for (const state of screenStates) {
  test(`${state.key} fits 360 px`, async ({ page, pk }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await state.before?.(page);
    await pk.open(state.key);
    await state.app?.(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const small = await page
      .locator('main button:visible, main a:visible, .screen__footer :is(a, button):visible')
      .evaluateAll((elements) =>
        elements
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.height < 44 && r.width > 0)
          .map((r) => `${Math.round(r.width)}×${Math.round(r.height)}`),
      );
    expect(small, 'controls under 44 px tall').toEqual([]);
  });

  test(`${state.key} is a centred column at 1280 px`, async ({ page, pk }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await state.before?.(page);
    await pk.open(state.key);
    await state.app?.(page);

    const box = await page.locator('.screen').first().boundingBox();
    expect(box?.width).toBeLessThanOrEqual(30 * 16);
    expect(Math.abs((box?.x ?? 0) * 2 + (box?.width ?? 0) - 1280)).toBeLessThanOrEqual(1);
  });
}
