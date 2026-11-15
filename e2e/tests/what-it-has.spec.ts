import responses from '../fixtures/api/responses.json';
import { offerNewPopkin } from '../fixtures/features';
import { howLongForLakeside, mockToday } from '../fixtures/journeys';
import { expect, test } from '../fixtures/pk-test';
import { hold, problem, answer } from '../fixtures/stubs';
import { HowLongPage } from '../pages/how-long.page';
import { NameYourPopkinPage } from '../pages/name-your-popkin.page';
import { WhatItHasPage } from '../pages/what-it-has.page';

const created = responses['POST /api/popkins'].body;

/** Opens "What should it have?" for Lakeside Weekend with these features offered. */
async function whatItHas(
  page: Parameters<typeof howLongForLakeside>[0],
  offered: ('Plan' | 'Schedules')[] = ['Plan', 'Schedules'],
): Promise<WhatItHasPage> {
  await offerNewPopkin(page, offered);
  await howLongForLakeside(page);
  await new HowLongPage(page).next.click();
  const step = new WhatItHasPage(page);
  await step.root.waitFor();
  return step;
}

test.describe('choosing what a new Popkin has', () => {
  // L2-152 AC1, AC6
  test('Next on How long opens What should it have?, with both features switched on', async ({
    page,
  }) => {
    await offerNewPopkin(page, ['Plan', 'Schedules']);
    await howLongForLakeside(page);
    const length = new HowLongPage(page);
    await expect(length.steps).toHaveAttribute('aria-label', 'Step 3 of 4');
    await expect(length.popItUp).toHaveCount(0);

    await length.next.click();

    const step = new WhatItHasPage(page);
    await expect(step.root).toBeAttached();
    await expect(step.heading).toHaveText('What should it have?');
    await expect(step.lead).toHaveText(
      'Chat, calls, photos and experiences are always there. Switch on anything else it needs.',
    );
    await expect(step.steps).toHaveAttribute('aria-label', 'Step 4 of 4');
    await expect(step.switches).toHaveCount(2);
    await expect(step.row('Plan')).toContainText(
      'A board of stories to share out the jobs, and a burn-down of what’s left.',
    );
    await expect(step.row('Schedules')).toContainText(
      'Everyone’s time off and hours, and the days of the event.',
    );
    await expect(step.feature('Plan')).toHaveAttribute('aria-checked', 'true');
    await expect(step.feature('Schedules')).toHaveAttribute('aria-checked', 'true');
  });

  // L2-152 AC2, AC6
  test('with nothing offered, How long is the last step and pops it up', async ({ page }) => {
    await offerNewPopkin(page, []);
    await page.clock.install({ time: mockToday });
    await page.goto('/new');
    const name = new NameYourPopkinPage(page);
    await expect(name.steps).toHaveAttribute('aria-label', 'Step 2 of 3');
    await name.chooseLakeside();
    await name.looksGood.click();

    const length = new HowLongPage(page);
    await expect(length.steps).toHaveAttribute('aria-label', 'Step 3 of 3');
    await expect(length.next).toHaveCount(0);
    await expect(length.popItUp).toHaveText('Pop it up');
  });

  // L2-152 AC6
  test('Name your Popkin reads step 2 of 4 while a feature is offered', async ({ page }) => {
    await offerNewPopkin(page, ['Schedules']);
    await page.goto('/new');

    await expect(new NameYourPopkinPage(page).steps).toHaveAttribute('aria-label', 'Step 2 of 4');
  });

  // L2-152 AC1
  test('only the features on for everyone are offered', async ({ page }) => {
    const step = await whatItHas(page, ['Schedules']);

    await expect(step.switches).toHaveCount(1);
    await expect(step.feature('Schedules')).toHaveAttribute('aria-checked', 'true');
  });

  // L2-152 AC3
  test('a switch turns by touch or click and by Space, and says whether it is on', async ({
    page,
  }) => {
    const step = await whatItHas(page);

    await step.feature('Plan').click();
    await expect(step.feature('Plan')).toHaveAttribute('aria-checked', 'false');

    await step.feature('Schedules').focus();
    await page.keyboard.press('Space');
    await expect(step.feature('Schedules')).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('Space');
    await expect(step.feature('Schedules')).toHaveAttribute('aria-checked', 'true');
  });

  // L2-152 AC6
  test('Back and Next keep the switches and the length', async ({ page }) => {
    const step = await whatItHas(page);
    await step.feature('Plan').click();

    await step.back.click();
    const length = new HowLongPage(page);
    await expect(length.option('The weekend')).toHaveAttribute('aria-checked', 'true');
    await length.next.click();

    await expect(step.feature('Plan')).toHaveAttribute('aria-checked', 'false');
    await expect(step.feature('Schedules')).toHaveAttribute('aria-checked', 'true');
  });

  // L2-152 AC2
  test('opened by its address with nothing offered, it goes back to How long', async ({
    page,
  }) => {
    await offerNewPopkin(page, []);
    await howLongForLakeside(page);
    await page.goto('/new/features');

    await expect(new HowLongPage(page).root).toBeAttached();
  });
});

test.describe('popping it up with its features', () => {
  // L2-152 AC4, AC7
  test('Pop it up sends the switches and opens the created screen', async ({ page }) => {
    const step = await whatItHas(page);
    await step.feature('Plan').click();

    const [request] = await Promise.all([
      page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/api/popkins')),
      step.popItUp.click(),
    ]);

    expect(request.postDataJSON()).toEqual({
      name: 'Lakeside Weekend',
      emoji: '🏕️',
      colour: 'Teal',
      length: 'TheWeekend',
      endsAt: new Date(2026, 8, 13, 18, 0).toISOString(),
      plan: false,
      schedules: true,
    });
    await expect(page).toHaveURL(new RegExp(`/p/${created.id}/created$`));
  });

  // L2-152 AC4
  test('Pop it up reads "Popping it up…" and is disabled until the Popkin exists', async ({
    page,
  }) => {
    const release = await hold(page, 'POST /api/popkins');
    const step = await whatItHas(page);

    await step.popItUp.click();

    await expect(step.popItUp).toHaveText('Popping it up…');
    await expect(step.popItUp).toBeDisabled();
    await expect(step.feature('Plan')).toBeDisabled();
    release();
    await expect(page).toHaveURL(new RegExp(`/p/${created.id}/created$`));
  });

  // L2-152 AC5
  test('a Popkin that cannot be created keeps the switches and enables Pop it up again', async ({
    page,
  }) => {
    await answer(page, 'POST /api/popkins', problem(500, 'server_error'));
    const step = await whatItHas(page);
    await step.feature('Schedules').click();

    await step.popItUp.click();

    await expect(step.alert).toContainText('We couldn’t pop it up.');
    await expect(step.alert).toContainText(
      'Something went wrong on our side. Your choices are still here.',
    );
    await expect(step.popItUp).toBeEnabled();
    await expect(step.popItUp).toHaveText('Pop it up');
    await expect(step.feature('Plan')).toHaveAttribute('aria-checked', 'true');
    await expect(step.feature('Schedules')).toHaveAttribute('aria-checked', 'false');
  });
});
