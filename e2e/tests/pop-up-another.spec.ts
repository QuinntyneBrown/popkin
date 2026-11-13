import responses from '../fixtures/api/responses.json';
import { mockToday } from '../fixtures/journeys';
import { expect, test } from '../fixtures/pk-test';
import { crewInvites } from '../fixtures/wrap-up';
import { HowLongPage } from '../pages/how-long.page';
import { NameYourPopkinPage } from '../pages/name-your-popkin.page';
import { Toasts } from '../pages/toasts';

const created = responses['POST /api/popkins'].body;
const lastSummer = '00000000-0000-4000-8000-0000000000aa';

async function popUp(page: import('@playwright/test').Page, from: string): Promise<void> {
  await page.clock.install({ time: mockToday });
  await page.goto(from);
  const name = new NameYourPopkinPage(page);
  await name.chooseLakeside();
  await name.looksGood.click();
  await new HowLongPage(page).popItUp.click();
}

// L2-046 AC5
test.describe('Pop up another with this crew', () => {
  test('sends the new Popkin’s invite to the crew once it exists, and says so', async ({
    page,
  }) => {
    const asked = await crewInvites(page);

    await popUp(page, `/new?crew=${lastSummer}`);

    await expect(page).toHaveURL(new RegExp(`/p/${created.id}/created$`));
    await expect(new Toasts(page).toast).toContainText('Invites are on their way');
    expect(asked).toEqual([{ popkinId: created.id, fromPopkinId: lastSummer }]);
  });

  test('keeps the crew through Back from the second step', async ({ page }) => {
    const asked = await crewInvites(page);
    await page.clock.install({ time: mockToday });
    await page.goto(`/new?crew=${lastSummer}`);
    const name = new NameYourPopkinPage(page);
    await name.chooseLakeside();
    await name.looksGood.click();
    const length = new HowLongPage(page);
    await length.back.click();
    await name.looksGood.click();

    await length.popItUp.click();

    await expect(page).toHaveURL(new RegExp(`/p/${created.id}/created$`));
    expect(asked).toHaveLength(1);
  });

  test('opens the new Popkin all the same when the invites do not go, and says so', async ({
    page,
  }) => {
    await crewInvites(page, 'fails');

    await popUp(page, `/new?crew=${lastSummer}`);

    await expect(page).toHaveURL(new RegExp(`/p/${created.id}/created$`));
    await expect(new Toasts(page).toast).toContainText('We couldn’t invite the crew');
  });

  // L2-046 AC6
  test('invites nobody when a Popkin is started on its own, also after one for a crew', async ({
    page,
  }) => {
    const asked = await crewInvites(page);
    await popUp(page, `/new?crew=${lastSummer}`);
    await expect(page).toHaveURL(new RegExp(`/p/${created.id}/created$`));

    await popUp(page, '/new');

    await expect(page).toHaveURL(new RegExp(`/p/${created.id}/created$`));
    expect(asked).toHaveLength(1);
  });
});
