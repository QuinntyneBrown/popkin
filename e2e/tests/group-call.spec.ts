import { callOf, callUrl, maraWithACall } from '../fixtures/call';
import { allowTheDevices, devicesAreOff, timesDevicesAsked } from '../fixtures/call-device';
import { homeUrl } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { InviteDialog } from '../pages/invite.dialog';
import { NotFoundPage } from '../pages/not-found.page';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { VideoCallPage } from '../pages/video-call.page';

test.describe('starting a group call', () => {
  // L2-029 AC1, AC5
  test('"Group call" on the home asks for the microphone and camera and opens the call with the member in it', async ({
    page,
  }) => {
    const call = await maraWithACall(page);
    await page.goto(homeUrl);
    await new PopkinHomePage(page).groupCall.click();
    const video = new VideoCallPage(page);

    await expect(video.root).toBeVisible();
    await expect(page).toHaveURL(callUrl);
    await expect(video.titles).toHaveText(/^🏕️\s*Lakeside Weekend/);
    await expect(video.root).toHaveAttribute('data-accent', 'teal');
    await expect(video.sub).toHaveText(/^Just you · 0:0\d$/);
    await expect(video.names).toHaveText(['You']);
    expect(await timesDevicesAsked(page)).toBe(1);
    expect(call.joined).toEqual([{ micOn: true, cameraOn: true }]);
  });

  // L2-029 AC5
  test('the header counts the time the call has run', async ({ page }) => {
    await maraWithACall(page);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.sub).toHaveText(/^Just you · 0:0\d$/);

    await page.clock.runFor(65_000);

    await expect(video.sub).toHaveText(/^Just you · 1:0\d$/);
  });

  // L2-029 AC1, L2-056
  test('says it is joining while the microphone and camera get ready', async ({ page }) => {
    const call = await maraWithACall(page, undefined, 'asking');
    await page.goto(callUrl);
    const video = new VideoCallPage(page);

    await expect(video.titles).toHaveText(/^🏕️\s*Lakeside Weekend/);
    await expect(video.sub).toHaveText('Connecting…');
    await expect(video.joining).toBeVisible();
    await expect(video.message).toContainText('Getting your camera and microphone ready.');
    await expect(video.tiles).toHaveCount(0);
    expect(call.joined).toEqual([]);
  });

  // L2-029 AC3
  test('alone on the call, it says it is waiting for the others and offers to invite them', async ({
    page,
  }) => {
    await maraWithACall(page);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);

    await expect(video.messageHeading).toHaveText('Waiting for the others');
    await expect(video.message).toContainText(
      'Everyone in Lakeside Weekend can see the call and join with one tap.',
    );
    await video.inviteToCall.click();

    await expect(new InviteDialog(page).heading).toBeVisible();
  });

  // L2-029 AC3
  test('"Invite to call" in the top bar opens the invite too', async ({ page }) => {
    await maraWithACall(page);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.names).toHaveText(['You']);

    await video.invite.click();

    await expect(new InviteDialog(page).heading).toBeVisible();
  });

  // L2-029 AC4
  test('a refused microphone and camera are explained, with the way back', async ({ page }) => {
    const call = await maraWithACall(page, undefined, 'denied');
    await page.goto(callUrl);
    const video = new VideoCallPage(page);

    await expect(video.sub).toHaveText('Not connected');
    await expect(video.failure).toContainText('We can’t reach your camera or microphone');
    await expect(video.failure).toContainText(
      'Allow them for Popkin in your browser’s site settings, then try again.',
    );
    await expect(video.controls).toHaveCount(0);
    expect(call.joined).toEqual([]);

    await video.backToThePopkin.click();

    await expect(new PopkinHomePage(page).root).toBeVisible();
    await expect(page).toHaveURL(homeUrl);
  });

  // L2-029 AC4
  test('"Try again" asks once more, and the call opens once they are allowed', async ({ page }) => {
    await maraWithACall(page, undefined, 'denied');
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.failure).toBeVisible();

    await allowTheDevices(page);
    await video.tryAgain.click();

    await expect(video.names).toHaveText(['You']);
    expect(await timesDevicesAsked(page)).toBe(2);
  });

  // L2-029 AC4, L2-056 AC6
  test('a call that cannot be joined says so and turns the microphone and camera off', async ({
    page,
  }) => {
    const call = await maraWithACall(page, (it) => it.fail());
    await page.goto(callUrl);
    const video = new VideoCallPage(page);

    await expect(video.sub).toHaveText('Not connected');
    await expect(video.failure).toContainText('We couldn’t connect you to the call');
    await expect(video.failure).toContainText('Check your connection, then try again.');
    expect(await devicesAreOff(page)).toBe(true);

    call.recover();
    await video.tryAgain.click();

    await expect(video.names).toHaveText(['You']);
  });

  // L2-051 AC1
  test('someone who is not a member of the Popkin gets the not-found screen', async ({ page }) => {
    await maraWithACall(page, (it) => it.fail('not-found'));
    await page.goto(callUrl);

    await expect(new NotFoundPage(page).root).toBeVisible();
    expect(callOf(page).joined).toEqual([]);
  });
});
