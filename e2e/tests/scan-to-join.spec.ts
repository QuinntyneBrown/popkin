import { aCamera, allowTheCamera, cameraIsOff, holdUp, timesAsked } from '../fixtures/camera';
import { inviteCode } from '../fixtures/journeys';
import { maraWithPopkins, noPopkins } from '../fixtures/my-popkins';
import { expect, test } from '../fixtures/pk-test';
import { JoinInvitePage } from '../pages/join-invite.page';
import { MyPopkinsPage } from '../pages/my-popkins.page';
import { ScanToJoinDialog } from '../pages/scan-to-join.dialog';

test.describe('Scan to join', () => {
  // L2-015 AC1
  test('asks for the camera and shows it with a frame to hold the QR code in', async ({ page }) => {
    await aCamera(page);
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await popkins.scanToJoin.click();

    const scan = new ScanToJoinDialog(page);
    await expect(scan.panel).toBeVisible();
    await expect(scan.description).toHaveText('Point your camera at the code on a friend’s phone.');
    await expect(scan.frame).toBeVisible();
    await expect(scan.hint).toHaveText('Hold the QR code inside the frame');
    await expect(scan.typeTheCode).toHaveAttribute('href', '/join');
    expect(await timesAsked(page)).toBe(1);
  });

  // L2-017 AC6
  test('opens from the empty state too', async ({ page }) => {
    await aCamera(page);
    await maraWithPopkins(page, noPopkins);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await popkins.emptyScanToJoin.click();

    await expect(new ScanToJoinDialog(page).frame).toBeVisible();
  });

  // L2-015 AC2
  test('a Popkin’s QR code opens its invite, and the camera stops', async ({ page }) => {
    await aCamera(page);
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();
    await popkins.scanToJoin.click();
    const scan = new ScanToJoinDialog(page);
    await expect(scan.frame).toBeVisible();

    await holdUp(page, `${new URL(page.url()).origin}/i/${inviteCode}`);

    await expect(new JoinInvitePage(page).root).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/i/${inviteCode}$`));
    await expect(scan.root).toHaveCount(0);
    expect(await cameraIsOff(page)).toBe(true);
  });

  // L2-015 AC3
  test('a QR code that is not a Popkin’s says so, and scanning goes on', async ({ page }) => {
    await aCamera(page);
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();
    await popkins.scanToJoin.click();
    const scan = new ScanToJoinDialog(page);
    await expect(scan.frame).toBeVisible();

    await holdUp(page, 'https://example.com/menu');

    await expect(scan.alert).toContainText('That’s not a Popkin code');
    await expect(scan.alert).toContainText('Keep scanning, or type the code instead.');
    await expect(scan.frame).toBeVisible();
    expect(await cameraIsOff(page)).toBe(false);

    await holdUp(page, inviteCode);

    await expect(new JoinInvitePage(page).root).toBeVisible();
  });

  // L2-015 AC4
  test('a refused camera is explained, with a way to type the code and to try again', async ({
    page,
  }) => {
    await aCamera(page, 'denied');
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await popkins.scanToJoin.click();

    const scan = new ScanToJoinDialog(page);
    await expect(scan.alert).toContainText('Popkin can’t use your camera');
    await expect(scan.alert).toContainText(
      'Allow the camera for Popkin in your browser’s site settings, or type the code instead.',
    );
    await expect(scan.scanner).toHaveCount(0);
    await expect(scan.typeTheCode).toHaveAttribute('href', '/join');
    await expect(scan.typeTheCode).toBeFocused();

    await allowTheCamera(page);
    await scan.tryTheCamera.click();

    await expect(scan.frame).toBeVisible();
    await expect(scan.alert).toHaveCount(0);
  });

  test('a device with no camera is told the same', async ({ page }) => {
    await aCamera(page, 'none');
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await popkins.scanToJoin.click();

    await expect(new ScanToJoinDialog(page).alert).toContainText('Popkin can’t use your camera');
  });

  // L2-057 AC2
  test('Escape closes it, stops the camera and returns to the button that opened it', async ({
    page,
  }) => {
    await aCamera(page);
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();
    await popkins.scanToJoin.click();
    const scan = new ScanToJoinDialog(page);
    await expect(scan.frame).toBeVisible();
    await expect.poll(() => timesAsked(page)).toBe(1);

    await page.keyboard.press('Escape');

    await expect(scan.root).toHaveCount(0);
    await expect(popkins.scanToJoin).toBeFocused();
    await expect.poll(() => cameraIsOff(page)).toBe(true);
  });

  test('Close closes it', async ({ page }) => {
    await aCamera(page);
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();
    await popkins.scanToJoin.click();
    const scan = new ScanToJoinDialog(page);

    await scan.close.click();

    await expect(scan.root).toHaveCount(0);
  });
});
