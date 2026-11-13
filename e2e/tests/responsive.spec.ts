import { expect, test } from '../fixtures/pk-test';
import { screenStates } from '../fixtures/screens';

/**
 * Responsive fit (L2-058 AC1, AC3, L2-057 AC4): at 360 px nothing scrolls sideways and every
 * control is a 44 px target; at 1280 px the screen fills the width and a form's fields and
 * actions stay in a column no wider than 36 rem.
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

  test(`${state.key} fills the width at 1280 px`, async ({ page, pk }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await state.before?.(page);
    await pk.open(state.key);
    await state.app?.(page);

    const screen = await page.locator('.screen').first().boundingBox();
    expect(screen?.x).toBe(0);
    expect(screen?.width).toBe(1280);
    const wide = await page
      .locator('main :is(input, .btn), .screen__footer .btn')
      .evaluateAll((elements) =>
        elements.map((e) => e.getBoundingClientRect().width).filter((width) => width > 36 * 16),
      );
    expect(wide, 'fields and actions wider than 36 rem').toEqual([]);
  });
}
