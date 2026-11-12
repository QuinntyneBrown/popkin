import AxeBuilder from '@axe-core/playwright';

// @axe-core/playwright types its page against its own copy of Playwright's types.
type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];
import { expect, test } from '../fixtures/pk-test';
import { screenStates } from '../fixtures/screens';

/**
 * Automated accessibility (L2-057): axe finds no WCAG 2.2 A or AA violation in either theme, and
 * every screen has one h1 and a main landmark. A sweep: only `npm run sweeps` runs it (ADR 0006).
 */
for (const state of screenStates) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${state.key} ${theme}`, async ({ page, pk }) => {
      await page.emulateMedia({ colorScheme: theme });
      await state.before?.(page);
      await pk.open(state.key);
      await state.app?.(page);

      const results = await new AxeBuilder({ page: page as unknown as AxePage })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);
    });
  }
}
