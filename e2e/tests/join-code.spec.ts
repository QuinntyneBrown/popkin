import { aCamera } from '../fixtures/camera';
import { asVisitor } from '../fixtures/journeys';
import { maraWithPopkins } from '../fixtures/my-popkins';
import { expect, test } from '../fixtures/pk-test';
import { JoinCodePage } from '../pages/join-code.page';
import { MyPopkinsPage } from '../pages/my-popkins.page';
import { ScanToJoinDialog } from '../pages/scan-to-join.dialog';
import { WelcomePage } from '../pages/welcome.page';

// L2-015 AC5: a person without the link types its code or pastes it.
test.describe('Join with a code', () => {
  test('opens from "Join with a code" on the welcome screen', async ({ page, pk }) => {
    await asVisitor(page);
    await pk.open('welcome');

    await new WelcomePage(page).joinWithCode.click();

    const join = new JoinCodePage(page);
    await expect(page).toHaveURL('/join');
    await expect(join.root).toBeVisible();
    await expect(join.heading).toHaveText('Got a code?');
    await expect(join.lead).toHaveText('Type the code or paste the link from your invite.');
    await expect(join.code).toBeFocused();
    await expect(join.hint).toHaveText('The code is the last part of your invite link.');
    await expect(join.find).toHaveText('Find my Popkin');
    await expect(join.back).toHaveAttribute('href', '/welcome');
  });

  test('opens from "Type the code instead" in Scan to join', async ({ page }) => {
    await aCamera(page);
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();
    await popkins.scanToJoin.click();
    const scan = new ScanToJoinDialog(page);

    await scan.typeTheCode.click();

    await expect(scan.panel).toHaveCount(0);
    await expect(new JoinCodePage(page).root).toBeVisible();
  });

  test('offers "Scan a QR code instead", which opens Scan to join', async ({ page }) => {
    await asVisitor(page);
    await aCamera(page);
    await page.goto('/join');
    const join = new JoinCodePage(page);

    await join.scanInstead.click();

    const scan = new ScanToJoinDialog(page);
    await expect(scan.frame).toBeVisible();
    await scan.typeTheCode.click();
    await expect(scan.panel).toHaveCount(0);
    await expect(join.root).toBeVisible();
  });

  // L2-058 AC10
  test('is split from 768 px, with the photograph of sign up beside it', async ({ page }) => {
    await asVisitor(page);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/join');
    const join = new JoinCodePage(page);
    await expect(join.heading).toBeVisible();
    await expect(join.picture).toBeHidden();

    await page.setViewportSize({ width: 1024, height: 768 });

    await expect(join.picture).toBeVisible();
    await expect(join.code).toBeVisible();
  });
});
