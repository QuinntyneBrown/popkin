import { chatUrl } from '../fixtures/chat';
import { homeUrl } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { maraWithWrapUp, recapUrl, wrapUpOf } from '../fixtures/wrap-up';
import { GroupChatPage } from '../pages/group-chat.page';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { RecapPage } from '../pages/recap.page';

// L2-044 AC4, L2-045 AC5
test.describe('A Popkin that wraps up while it is open', () => {
  test('moves the home to the recap when the Host wraps it up', async ({ page, hub }) => {
    const wrapUp = await maraWithWrapUp(page);
    await page.goto(homeUrl);
    await expect(new PopkinHomePage(page).heading).toBeVisible();

    await wrapUp.wrapsUpElsewhere(hub);

    await expect(page).toHaveURL(recapUrl);
    await expect(new RecapPage(page).root).toBeVisible();
    await page.goBack();
    await expect(page).not.toHaveURL(homeUrl);
  });

  test('moves the Everyone thread to the recap too', async ({ page, hub }) => {
    const wrapUp = await maraWithWrapUp(page);
    await page.goto(chatUrl);
    await expect(new GroupChatPage(page).composer).toBeVisible();

    await wrapUp.wrapsUpElsewhere(hub);

    await expect(page).toHaveURL(recapUrl);
  });

  test('leaves a member alone when another Popkin wraps up', async ({ page, hub }) => {
    await maraWithWrapUp(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    await expect(home.heading).toBeVisible();

    await hub.push('PopkinWrappedUp', '00000000-0000-4000-8000-00000000ffff');
    await hub.push('MemberJoined', '00000000-0000-4000-8000-00000000ffff', {});

    await expect(home.heading).toBeVisible();
    await expect(page).toHaveURL(homeUrl);
  });

  test('moves to the recap, without the hub, once its time is up', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 8, 13, 17, 59) });
    await maraWithWrapUp(page);
    await page.goto(homeUrl);
    await expect(new PopkinHomePage(page).heading).toBeVisible();

    await page.clock.runFor(60_000);
    wrapUpOf(page).wrap();
    await page.clock.runFor(60_000);

    await expect(page).toHaveURL(recapUrl);
  });

  test('shows the recap first to someone who opens a wrapped-up Popkin', async ({ page }) => {
    await maraWithWrapUp(page, (wrapUp) => wrapUp.wrap());

    await page.goto(homeUrl);

    await expect(page).toHaveURL(recapUrl);
    await expect(new RecapPage(page).root).toBeVisible();
  });
});
