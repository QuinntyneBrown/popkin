import { callUrl, callers, maraWithACall, theMocksCall } from '../fixtures/call';
import { chatUrl } from '../fixtures/chat';
import { homeUrl } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { CallBanner } from '../pages/call-banner';
import { GroupChatPage } from '../pages/group-chat.page';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { VideoCallPage } from '../pages/video-call.page';

for (const [where, url] of [
  ['the Popkin home', homeUrl],
  ['the Everyone thread', chatUrl],
] as const) {
  test.describe(`the banner of a group call on ${where}`, () => {
    // L2-029 AC2
    test('says how many are on the call under way and offers "Join"', async ({ page }) => {
      const call = await maraWithACall(page, theMocksCall);
      await page.goto(url);
      const banner = new CallBanner(page);

      await expect(banner.text).toHaveText('Group call · 5 on the call');
      await banner.join.click();

      const video = new VideoCallPage(page);
      await expect(video.root).toBeVisible();
      await expect(page).toHaveURL(callUrl);
      await expect(video.names).toHaveCount(6);
      expect(call.joined).toHaveLength(1);
    });

    // L2-029 AC2
    test('is not there when no call is under way', async ({ page }) => {
      const call = await maraWithACall(page);
      await page.goto(url);

      await expect.poll(() => call.readCurrent).toBeGreaterThan(0);
      await expect(new CallBanner(page).root).toHaveCount(0);
    });

    // L2-029 AC2, AC6
    test('appears when someone starts a call, follows the count, and goes when the last person leaves', async ({
      page,
      hub,
    }) => {
      const call = await maraWithACall(page);
      await page.goto(url);
      const banner = new CallBanner(page);
      await hub.connected();
      await expect.poll(() => call.readCurrent).toBeGreaterThan(1);

      await call.joins(hub, callers.walt);
      await expect(banner.text).toHaveText('Group call · 1 on the call');

      await call.joins(hub, callers.dev);
      await expect(banner.text).toHaveText('Group call · 2 on the call');

      await call.leaves(hub, callers.dev);
      await call.leaves(hub, callers.walt);
      await expect(banner.root).toHaveCount(0);
    });
  });
}

test.describe('starting a call from the Everyone thread', () => {
  // L2-029 AC1
  test('"Start group call" opens the call with the member in it', async ({ page }) => {
    const call = await maraWithACall(page);
    await page.goto(chatUrl);

    await new GroupChatPage(page).startGroupCall.click();

    const video = new VideoCallPage(page);
    await expect(video.root).toBeVisible();
    await expect(video.names).toHaveText(['You']);
    expect(call.joined).toHaveLength(1);
  });
});

test.describe('the banner at each width', () => {
  // L2-058
  test('sits above the two columns of the home at 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await maraWithACall(page, theMocksCall);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    const banner = new CallBanner(page);
    await expect(banner.root).toBeVisible();

    const [bannerBox, mainBox, sideBox] = await Promise.all([
      banner.root.boundingBox(),
      home.main.boundingBox(),
      home.side.boundingBox(),
    ]);
    expect(bannerBox!.y + bannerBox!.height).toBeLessThanOrEqual(mainBox!.y + 1);
    expect(bannerBox!.y + bannerBox!.height).toBeLessThanOrEqual(sideBox!.y + 1);
  });
});
