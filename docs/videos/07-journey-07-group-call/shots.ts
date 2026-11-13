import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { type Call, callUrl, callers, maraWithACall, theMocksCall } from '../../../e2e/fixtures/call';
import type { DeviceAnswer } from '../../../e2e/fixtures/call-device';
import { chatUrl } from '../../../e2e/fixtures/chat';
import { says } from '../../../e2e/fixtures/far-end';
import { homeNow, homeUrl } from '../../../e2e/fixtures/home';
import { test } from '../../../e2e/fixtures/pk-test';
import { CallBanner } from '../../../e2e/pages/call-banner';
import { GroupChatPage } from '../../../e2e/pages/group-chat.page';
import { PopkinHomePage } from '../../../e2e/pages/popkin-home.page';
import { VideoCallPage } from '../../../e2e/pages/video-call.page';
import { detail, frame, shot, type Size } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 07: journey 7, Group call, in the running app. Every /api request is
 * answered by the call stub of `e2e/fixtures/call.ts`, the home's stub or the recording, the hub
 * by `e2e/fixtures/hub.ts`, the microphone and camera by `e2e/fixtures/call-device.ts` and the
 * other people of the call by `e2e/fixtures/far-end.ts`, inside the page (ADR 0005, ADR 0010,
 * ADR 0014); no backend, no camera, no microphone and no second machine ran. The pictures the
 * stubs send are flat colours, not faces. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/07-journey-07-group-call` runs it.
 */

// A call measures sound from the moment it opens, with no press before it (e2e/playwright.config.ts).
test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } });

const closeUp = (region: Locator, name: string, pad = 12) => detail(region, name, pad);

/** Mara with a call, at the mocks' moment held still: a call under way has run 12:48. */
async function at(page: Page, arrange?: (call: Call) => void, device?: DeviceAnswer): Promise<Call> {
  const call = await maraWithACall(page, arrange, device);
  // The date stands still; the timers that carry sound and picture go on.
  await page.clock.setFixedTime(homeNow);
  return call;
}

/** Six on the call, Mara the fourth, as the mocks seat them. */
const six = (call: Call): void => {
  theMocksCall(call);
  call.maraAt = 3;
};
const two = (call: Call): void => {
  call.underWay = true;
  call.others = [callers.walt];
};

/** 640 px, where the tiles go three across: between the phone and the tablet of `SIZES`. */
async function frameAt640(page: Page): Promise<void> {
  await page.setViewportSize({ width: 640, height: 900 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
}

/** Opens the call and waits until everyone's picture has arrived and Walt is speaking. */
async function openWithWaltSpeaking(page: Page, people: number): Promise<VideoCallPage> {
  await page.goto(callUrl);
  const video = new VideoCallPage(page);
  await expect(video.names).toHaveCount(people);
  await expect(video.person('Walt').video).toBeVisible();
  await expect.poll(() => video.isPlaying(video.person('Walt'))).toBe(true);
  await expect.poll(() => video.isPlaying(video.person('You'))).toBe(true);
  await says(page, callers.walt.membershipId);
  await expect(video.speaking).toHaveCount(1);
  return video;
}

/** Waits until every picture on the page has arrived. */
async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

test('where a call starts: the home and the Everyone thread', async ({ page }) => {
  await at(page);
  await frame(page, 'XS');
  await page.goto(homeUrl);
  const home = new PopkinHomePage(page);
  await home.groupCall.waitFor();
  await home.memberRows.first().waitFor();
  await pictures(page);
  await shot(page, 'home-xs');
  await closeUp(home.actions, 'home-actions', 10);

  await page.goto(chatUrl);
  const chat = new GroupChatPage(page);
  await chat.startGroupCall.waitFor();
  await pictures(page);
  await shot(page, 'chat-xs');
  await closeUp(chat.topBar, 'chat-top-bar', 0);
});

test('joining: the microphone and camera are getting ready', async ({ page }) => {
  await at(page, undefined, 'asking');
  await frame(page, 'XS');
  await page.goto(callUrl);
  const video = new VideoCallPage(page);
  await video.joining.waitFor();
  await expect(video.sub).toHaveText('Connecting…');
  await shot(page, 'call-joining-xs');
  await closeUp(video.topBar, 'call-joining-top-bar', 0);
});

test('alone on the call', async ({ page }) => {
  await at(page);
  for (const size of ['XS', 'M'] as const) {
    await frame(page, size);
    await page.clock.setFixedTime(homeNow);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.names).toHaveText(['You']);
    await expect.poll(() => video.isPlaying(video.person('You'))).toBe(true);
    // Twelve seconds on: the date moves, and the header's next tick reads it.
    await page.clock.setFixedTime(new Date(homeNow.getTime() + 12_000));
    await expect(video.sub).toHaveText('Just you · 0:12');
    // The film shows this state on the tablet, where all of it fits.
    if (size === 'M') await shot(page, 'call-alone-m');
    if (size === 'XS') await closeUp(video.topBar, 'call-alone-top-bar', 0);
    // On the phone the stage cuts "Invite to call" off under the message; the close-up is the tablet's.
    if (size === 'M') await closeUp(video.message, 'call-alone-message', 8);
    await video.leave.click();
    await new PopkinHomePage(page).root.waitFor();
  }
});

test('six on the call, from 390 to 1440 px', async ({ page }) => {
  await at(page, six);
  for (const size of ['XS', 'M', 'L', 'XL'] as const satisfies readonly Size[]) {
    await frame(page, size);
    const video = await openWithWaltSpeaking(page, 6);
    await shot(page, `call-six-${size.toLowerCase()}`);
    if (size === 'XS') {
      await closeUp(video.topBar, 'call-six-top-bar', 0);
      await closeUp(video.person('Walt').root, 'tile-walt', 10);
      await closeUp(video.person('Ruth').root, 'tile-ruth', 10);
      await closeUp(video.person('Sam').root, 'tile-sam', 10);
      await closeUp(video.controls, 'controls', 10);
    }
    if (size === 'XL') await closeUp(video.aside, 'call-pane', 0);
  }
  await frameAt640(page);
  await openWithWaltSpeaking(page, 6);
  await shot(page, 'call-six-640');
});

test('two on the call, on a phone and at 640 px', async ({ page }) => {
  await at(page, two);
  await frame(page, 'XS');
  await openWithWaltSpeaking(page, 2);
  await shot(page, 'call-two-xs');
  await frameAt640(page);
  await openWithWaltSpeaking(page, 2);
  await shot(page, 'call-two-640');
});

test('Mute becomes Unmute', async ({ page }) => {
  await at(page, six);
  await frame(page, 'XS');
  const video = await openWithWaltSpeaking(page, 6);
  await video.mute.click();
  await expect(video.person('You').mutedIcon).toBeVisible();
  await shot(page, 'call-muted-xs');
  await closeUp(video.controls, 'controls-muted', 10);
  await closeUp(video.person('You').root, 'tile-you-muted', 10);
});

test('Camera becomes Camera off', async ({ page }) => {
  await at(page, six);
  await frame(page, 'XS');
  const video = await openWithWaltSpeaking(page, 6);
  await closeUp(video.person('You').root, 'tile-you', 10);
  await video.camera.click();
  await expect(video.person('You').avatar).toBeVisible();
  await pictures(page);
  await shot(page, 'call-camera-off-xs');
  await closeUp(video.controls, 'controls-camera-off', 10);
  await closeUp(video.person('You').root, 'tile-you-camera-off', 10);
});

test('Leave returns to the screen the member came from', async ({ page }) => {
  await at(page, six);
  await frame(page, 'XS');
  await page.goto(chatUrl);
  const chat = new GroupChatPage(page);
  await new CallBanner(page).join.click();
  const video = new VideoCallPage(page);
  await expect(video.names).toHaveCount(6);
  await video.leave.click();
  await chat.startGroupCall.waitFor();
  await expect(new CallBanner(page).text).toHaveText('Group call · 5 on the call');
  await pictures(page);
  await shot(page, 'left-chat-xs');
});

test('Minimise call: the home with the call still running', async ({ page }) => {
  await at(page, six);
  await frame(page, 'XS');
  const video = await openWithWaltSpeaking(page, 6);
  await video.minimise.click();
  const home = new PopkinHomePage(page);
  await home.root.waitFor();
  const banner = new CallBanner(page);
  await banner.return.waitFor();
  await expect(banner.text).toHaveText('Group call · 6 on the call');
  await home.memberRows.first().waitFor();
  await pictures(page);
  await shot(page, 'home-return-xs');
  await closeUp(banner.root, 'banner-return', 8);
});

test('the banner for everyone else: it appears, follows the count and goes', async ({ page, hub }) => {
  const call = await at(page);
  await frame(page, 'XS');
  await page.goto(homeUrl);
  const home = new PopkinHomePage(page);
  const banner = new CallBanner(page);
  await hub.connected();
  await expect.poll(() => call.readCurrent).toBeGreaterThan(1);
  await home.memberRows.first().waitFor();
  await pictures(page);

  await call.joins(hub, callers.walt);
  await expect(banner.text).toHaveText('Group call · 1 on the call');
  await shot(page, 'home-banner-1-xs');
  await closeUp(banner.root, 'banner-1', 8);

  await call.joins(hub, callers.dev);
  await expect(banner.text).toHaveText('Group call · 2 on the call');
  await shot(page, 'home-banner-2-xs');
  await closeUp(banner.root, 'banner-2', 8);

  await call.leaves(hub, callers.dev);
  await call.leaves(hub, callers.walt);
  await expect(banner.root).toHaveCount(0);
  await shot(page, 'home-banner-gone-xs');
});

test('the banner with Join: the Everyone thread, the home at 1440 px, and in the dark', async ({ page }) => {
  await at(page, theMocksCall);
  await frame(page, 'XS');
  await page.goto(chatUrl);
  const banner = new CallBanner(page);
  await banner.join.waitFor();
  await pictures(page);
  await shot(page, 'chat-banner-xs');
  await closeUp(banner.root, 'banner-join', 8);

  await frame(page, 'XL');
  await page.goto(homeUrl);
  await banner.join.waitFor();
  await new PopkinHomePage(page).memberRows.first().waitFor();
  await pictures(page);
  await shot(page, 'home-banner-xl');

  await frame(page, 'XS', 'dark');
  await page.goto(homeUrl);
  await banner.join.waitFor();
  await new PopkinHomePage(page).memberRows.first().waitFor();
  await pictures(page);
  await shot(page, 'home-banner-xs-dark');
});

test('a refused microphone and camera', async ({ page }) => {
  await at(page, undefined, 'denied');
  await frame(page, 'XS');
  await page.goto(callUrl);
  const video = new VideoCallPage(page);
  await video.failure.waitFor();
  await expect(video.sub).toHaveText('Not connected');
  await video.tryAgain.waitFor();
  await shot(page, 'call-refused-xs');
  await closeUp(video.topBar, 'call-refused-top-bar', 0);
  await closeUp(video.message, 'call-refused-message', 8);
});
