import { homeUrl, maraAtHome } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { scan } from '../fixtures/qr';
import { answer, problem } from '../fixtures/stubs';
import { popkinId } from '../fixtures/chat';
import { InviteDialog } from '../pages/invite.dialog';
import { PopkinHomePage } from '../pages/popkin-home.page';

const inviteKey = `GET /api/popkins/${popkinId}/invite`;

test.describe('the Invite dialog', () => {
  test.beforeEach(async ({ page }) => {
    await maraAtHome(page);
    await page.goto(homeUrl);
  });

  // L2-011 AC1
  test('Invite opens "Bring someone in" with the QR code, the emoji, the name and the link', async ({
    page,
  }) => {
    await new PopkinHomePage(page).invite.click();
    const dialog = new InviteDialog(page);

    await expect(dialog.heading).toBeVisible();
    await expect(dialog.heading).toHaveText('Bring someone in');
    await expect(dialog.root).toHaveAccessibleDescription(
      'They scan, they’re in. No numbers needed.',
    );
    await expect(dialog.qr).toHaveAccessibleName('QR code for popk.in/lakeside');
    await expect(dialog.tile).toHaveText('🏕️');
    await expect(dialog.name).toHaveText('🏕️Lakeside Weekend');
    await expect(dialog.link).toHaveText('popk.in/lakeside');
  });

  // L2-011 AC6
  test('the QR code holds the invite link', async ({ page }) => {
    await new PopkinHomePage(page).invite.click();
    const dialog = new InviteDialog(page);

    expect(await scan(dialog.qr)).toBe('https://popk.in/lakeside');
  });

  // L2-011 AC2
  test('Copy invite link copies the link and reads "Copied" for 3 seconds, announced', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.clock.install();
    await new PopkinHomePage(page).invite.click();
    const dialog = new InviteDialog(page);

    await dialog.copy.click();

    await expect(dialog.copy).toHaveText('Copied');
    await expect(dialog.status).toHaveText('Invite link copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'https://popk.in/lakeside',
    );
    await page.clock.runFor(3_000);
    await expect(dialog.copy).toHaveText('Copy invite link');
  });

  // L2-011 AC3, L2-057 AC2
  test('Escape closes it and returns focus to Invite', async ({ page }) => {
    const home = new PopkinHomePage(page);
    await home.invite.click();
    const dialog = new InviteDialog(page);
    await expect(dialog.heading).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(dialog.root).toHaveCount(0);
    await expect(home.invite).toBeFocused();
  });

  // L2-011 AC3
  test('Close closes it and returns focus to Invite', async ({ page }) => {
    const home = new PopkinHomePage(page);
    await home.invite.click();
    const dialog = new InviteDialog(page);

    await dialog.close.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(home.invite).toBeFocused();
  });

  // L2-011 AC3
  test('choosing outside the dialog closes it and returns focus to Invite', async ({ page }) => {
    const home = new PopkinHomePage(page);
    await home.invite.click();
    const dialog = new InviteDialog(page);
    await expect(dialog.heading).toBeVisible();

    await dialog.backdrop.click({ position: { x: 5, y: 5 } });

    await expect(dialog.root).toHaveCount(0);
    await expect(home.invite).toBeFocused();
  });

  // L2-057 AC2: focus stays inside while it is open
  test('keeps the keyboard inside the dialog while it is open', async ({ page }) => {
    await new PopkinHomePage(page).invite.click();
    const dialog = new InviteDialog(page);
    await expect(dialog.copy).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(dialog.close).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.copy).toBeFocused();
  });

  // L2-011 AC4
  test('is a sheet on the bottom edge below 640 px and centred from 640 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await new PopkinHomePage(page).invite.click();
    const dialog = new InviteDialog(page);
    await expect(dialog.heading).toBeVisible();

    await expect.poll(() => dialog.isSheet(780)).toBe(true);

    await page.setViewportSize({ width: 640, height: 780 });

    await expect.poll(() => dialog.isSheet(780)).toBe(false);
  });
});

test.describe('the Invite dialog from an empty home', () => {
  // L2-019 AC8
  test('"Invite people" opens it too, and focus returns there', async ({ page }) => {
    await maraAtHome(page, (home) => home.justTheHost());
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await home.invitePeople.click();
    const dialog = new InviteDialog(page);
    await expect(dialog.link).toHaveText('popk.in/lakeside');

    await page.keyboard.press('Escape');

    await expect(home.invitePeople).toBeFocused();
  });
});

test.describe('the Invite dialog when the invite cannot be read', () => {
  // L2-056
  test('says so in the dialog and Try again reads it', async ({ page }) => {
    await maraAtHome(page);
    await answer(page, inviteKey, problem(500, 'server_error'));
    await page.goto(homeUrl);
    await new PopkinHomePage(page).invite.click();
    const dialog = new InviteDialog(page);

    await expect(dialog.error).toContainText('We couldn’t load the invite.');
    await expect(dialog.qr).toHaveCount(0);

    await answer(page, inviteKey, {
      status: 200,
      body: {
        code: 'lakeside',
        url: 'https://popk.in/lakeside',
        popkinName: 'Lakeside Weekend',
        emoji: '🏕️',
        colour: 'Teal',
      },
    });
    await dialog.tryAgain.click();

    await expect(dialog.link).toHaveText('popk.in/lakeside');
  });
});
