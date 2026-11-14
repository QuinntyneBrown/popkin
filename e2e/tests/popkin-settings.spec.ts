import { homeNow, homeUrl } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { maraWithWrapUp, wrapUpUrl } from '../fixtures/wrap-up';
import { InviteDialog } from '../pages/invite.dialog';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { PopkinSettingsDialog } from '../pages/popkin-settings.dialog';
import { WrapUpPage } from '../pages/wrap-up.page';

// L2-020 AC1, AC2: what the Host, and any other member, may do with the Popkin.
test.describe('Popkin settings', () => {
  test('offers the Host to edit it, change how long it lasts, invite people and wrap up', async ({
    page,
  }) => {
    await page.clock.install({ time: homeNow });
    await maraWithWrapUp(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await home.settings.click();

    const settings = new PopkinSettingsDialog(page);
    await expect(settings.heading).toHaveText('Lakeside Weekend');
    await expect(settings.items).toHaveText([
      /Edit name and look/,
      /Change how long it lasts/,
      /Invite people/,
      /Wrap up/,
    ]);
    await expect(settings.editLook).toContainText('Name, emoji and colour');
    await expect(settings.changeLength).toContainText('Wraps up Sun, 6 pm');
    await expect(settings.invitePeople).toContainText('QR code and link');
    await expect(settings.wrapUp).toContainText('End it now and send the recap');
  });

  // L2-020 AC2, L2-047 AC3: a member may leave; the Host has no way to.
  test('offers a member who is not the Host to invite people and to leave, only', async ({
    page,
  }) => {
    await maraWithWrapUp(page, (wrapUp) => wrapUp.asMember());
    await page.goto(homeUrl);

    await new PopkinHomePage(page).settings.click();

    const settings = new PopkinSettingsDialog(page);
    await expect(settings.items).toHaveCount(2);
    await expect(settings.invitePeople).toBeVisible();
    await expect(settings.leave).toContainText('You can come back with a new invite');
    await expect(settings.wrapUp).toHaveCount(0);
    await expect(settings.editLook).toHaveCount(0);
    await expect(settings.changeLength).toHaveCount(0);
  });

  test('offers the Host no way to leave', async ({ page }) => {
    await maraWithWrapUp(page);
    await page.goto(homeUrl);

    await new PopkinHomePage(page).settings.click();

    await expect(new PopkinSettingsDialog(page).leave).toHaveCount(0);
  });

  test('closes on Escape and gives the focus back to its button', async ({ page }) => {
    await maraWithWrapUp(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    await home.settings.click();
    const settings = new PopkinSettingsDialog(page);
    await expect(settings.menu).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(settings.root).toHaveCount(0);
    await expect(home.settings).toBeFocused();
  });

  test('opens the invite from "Invite people"', async ({ page }) => {
    await maraWithWrapUp(page);
    await page.goto(homeUrl);
    await new PopkinHomePage(page).settings.click();

    await new PopkinSettingsDialog(page).invitePeople.click();

    await expect(new InviteDialog(page).heading).toHaveText('Bring someone in');
  });

  test('opens the wrap-up screen from "Wrap up", by the keyboard too', async ({ page }) => {
    await maraWithWrapUp(page);
    await page.goto(homeUrl);
    await new PopkinHomePage(page).settings.click();
    const settings = new PopkinSettingsDialog(page);

    await settings.wrapUp.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(wrapUpUrl);
    await expect(new WrapUpPage(page).root).toBeVisible();
    await expect(settings.root).toHaveCount(0);
  });
});
