import { callOf, callUrl, callers, guest, maraWithACall, theMocksCall } from '../fixtures/call';
import { devicesAreOff, goQuiet, isSending, speakUp } from '../fixtures/call-device';
import { chatUrl } from '../fixtures/chat';
import { says } from '../fixtures/far-end';
import { homeUrl } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { CallBanner } from '../pages/call-banner';
import { GroupChatPage } from '../pages/group-chat.page';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { VideoCallPage } from '../pages/video-call.page';

test.describe('the tiles of a call', () => {
  // L2-029 AC5, L2-030 AC2
  test('joining a call under way shows everyone on it by first name, and the member as "You"', async ({
    page,
  }) => {
    const call = await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);

    await expect(video.sub).toHaveText(/^6 on the call · 12:\d\d$/);
    await expect(video.names).toHaveText(['Walt', 'Ellie', 'Dev', 'Ruth', 'Muted, Sam', 'You']);
    await expect(video.messageHeading).toHaveCount(0);
    expect(call.joined).toHaveLength(1);
  });

  // L2-030 AC2
  test('the member sees their own camera; someone whose camera is off shows their avatar', async ({
    page,
  }) => {
    await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);

    await expect.poll(() => video.isPlaying(video.person('You'))).toBe(true);
    await expect(video.person('Ruth').avatar).toHaveText('RL');
    await expect(video.person('Ruth').video).toHaveCount(0);
  });

  // L2-030 AC3
  test('someone who is muted has a muted microphone beside their name', async ({ page }) => {
    await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);

    await expect(video.person('Sam').mutedIcon).toBeVisible();
    await expect(video.person('Sam').name).toHaveText('Muted, Sam');
    await expect(video.person('Walt').mutedIcon).toHaveCount(0);
  });

  // L2-030 AC2, AC3
  test('someone who mutes or turns their camera off while the call runs shows it at once', async ({
    page,
    hub,
  }) => {
    const call = await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.names).toHaveCount(6);

    await call.switches(hub, callers.walt, { micOn: false, cameraOn: false });

    await expect(video.person('Walt').name).toHaveText('Muted, Walt');
    await expect(video.person('Walt').avatar).toBeVisible();
  });

  // L2-029 AC5
  test('someone who joins or leaves is added to or taken from the stage and the count', async ({
    page,
    hub,
  }) => {
    const call = await maraWithACall(page, (it) => {
      it.underWay = true;
      it.others = [callers.walt];
    });
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.names).toHaveText(['Walt', 'You']);

    await call.joins(hub, callers.dev);
    await expect(video.names).toHaveText(['Walt', 'You', 'Dev']);
    await expect(video.sub).toHaveText(/^3 on the call/);

    await call.leaves(hub, callers.walt);
    await expect(video.names).toHaveText(['You', 'Dev']);
    await expect(video.sub).toHaveText(/^2 on the call/);
  });

  // L2-029 AC7
  test('with more than twelve on the call, eleven are shown and the rest are counted', async ({
    page,
  }) => {
    await maraWithACall(page, (it) => {
      it.underWay = true;
      it.others = Array.from({ length: 14 }, (_, at) => guest(at + 1));
    });
    await page.goto(callUrl);
    const video = new VideoCallPage(page);

    await expect(video.sub).toHaveText(/^15 on the call/);
    await expect(video.tiles).toHaveCount(11);
    await expect(video.person('You').root).toBeVisible();
    await expect(video.rest).toHaveText('4 more on the call');
  });

  // L2-030 AC2: the links between browsers really carry the picture (ADR 0014)
  test('someone’s camera arrives and plays in their tile', async ({ page }) => {
    await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);

    await expect(video.person('Walt').video).toBeVisible();
    await expect.poll(() => video.isPlaying(video.person('Walt'))).toBe(true);
    await expect(video.person('Walt').avatar).toHaveCount(0);
  });

  // L2-030 AC4
  test('whoever is speaking has a ring in the Popkin’s colour, and the pane says so', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.person('Walt').video).toBeVisible();

    await says(page, callers.walt.membershipId);

    await expect(video.person('Walt').name).toHaveText('Walt, speaking');
    await expect(video.speaking).toHaveCount(1);
    expect(await video.ringWidth()).toBeGreaterThanOrEqual(3);
    await expect(video.row('Walt Brennan')).toContainText('Speaking');

    await says(page, callers.walt.membershipId, 0);

    await expect(video.speaking).toHaveCount(0);
  });

  // L2-030 AC4
  test('the member’s tile has a ring of at least 3 px while they speak, and says so', async ({
    page,
  }) => {
    await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.names).toHaveCount(6);
    await expect(video.speaking).toHaveCount(0);

    await speakUp(page);

    await expect(video.speaking).toHaveCount(1);
    await expect(video.person('You').name).toHaveText('You, speaking');
    expect(await video.ringWidth()).toBeGreaterThanOrEqual(3);

    await goQuiet(page);

    await expect(video.speaking).toHaveCount(0);
  });
});

test.describe('the layout of a call', () => {
  // L2-030 AC1
  for (const [width, across] of [
    [360, 1],
    [640, 2],
  ] as const) {
    test(`two people are ${across === 1 ? 'in one column' : 'side by side'} at ${width} px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await maraWithACall(page, (it) => {
        it.underWay = true;
        it.others = [callers.walt];
      });
      await page.goto(callUrl);
      const video = new VideoCallPage(page);
      await expect(video.names).toHaveCount(2);

      expect(await video.across()).toBe(across);
      expect(await video.tilesAreEqual()).toBe(true);
      expect(await video.fitsTheScreen()).toBe(true);
    });
  }

  // L2-030 AC1
  for (const others of [2, 3]) {
    test(`${others + 1} people are in two columns of equal tiles`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await maraWithACall(page, (it) => {
        it.underWay = true;
        it.others = [callers.walt, callers.dev, callers.ellie].slice(0, others);
      });
      await page.goto(callUrl);
      const video = new VideoCallPage(page);
      await expect(video.names).toHaveCount(others + 1);

      expect(await video.across()).toBe(2);
      if (others === 3) expect(await video.tilesAreEqual()).toBe(true);
    });
  }

  // L2-030 AC1
  for (const [width, across] of [
    [360, 2],
    [640, 3],
    [1280, 3],
  ] as const) {
    test(`six people are ${across} across at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await maraWithACall(page, theMocksCall);
      await page.goto(callUrl);
      const video = new VideoCallPage(page);
      await expect(video.names).toHaveCount(6);

      expect(await video.across()).toBe(across);
      expect(await video.tilesAreEqual()).toBe(true);
      expect(await video.fitsTheScreen()).toBe(true);
    });
  }

  // L2-058 AC12
  test('from 1280 px a pane lists who is on the call, each microphone in words', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);

    await expect(video.aside).toBeVisible();
    await expect(video.people).toHaveCount(6);
    await expect(video.row('Walt Brennan')).toContainText('Microphone on');
    await expect(video.row('Sam Ortega')).toContainText('Muted');
    await expect(video.row('Mara Okafor (you)')).toContainText('Microphone on');
    await expect(video.asideNote).toHaveText('8 others in Lakeside Weekend can join anytime.');
  });

  // L2-058 AC12
  test('below 1280 px the pane is not shown, nor read out', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.names).toHaveCount(6);

    await expect(video.aside).toBeHidden();
  });

  // L2-030 AC5, L2-058
  test('the controls carry their labels at every width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);

    await expect(video.controls).toContainText('Mute');
    await expect(video.controls).toContainText('Camera');
    await expect(video.controls).toContainText('Leave');
  });
});

test.describe('the controls of a call', () => {
  // L2-030 AC5, AC3
  test('"Mute" turns the microphone off, is marked as pressed and reads "Unmute"', async ({
    page,
  }) => {
    const call = await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.mute).toHaveAccessibleName('Mute');
    await expect(video.mute).toHaveAttribute('aria-pressed', 'false');

    await video.mute.click();

    await expect(video.mute).toHaveAccessibleName('Unmute');
    await expect(video.mute).toHaveAttribute('aria-pressed', 'true');
    await expect(video.controls).toContainText('Unmute');
    await expect(video.person('You').name).toHaveText('Muted, You');
    expect(await isSending(page, 'audio')).toBe(false);
    await expect.poll(() => call.switched).toEqual([{ micOn: false, cameraOn: true }]);

    await video.mute.click();

    await expect(video.mute).toHaveAccessibleName('Mute');
    await expect(video.person('You').mutedIcon).toHaveCount(0);
    expect(await isSending(page, 'audio')).toBe(true);
  });

  // L2-030 AC5, AC2
  test('"Camera" turns the camera off, is marked as pressed and reads "Camera off"', async ({
    page,
  }) => {
    const call = await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.camera).toHaveAccessibleName('Camera');

    await video.camera.click();

    await expect(video.camera).toHaveAccessibleName('Camera off');
    await expect(video.camera).toHaveAttribute('aria-pressed', 'true');
    await expect(video.controls).toContainText('Camera off');
    await expect(video.person('You').avatar).toBeVisible();
    await expect(video.person('You').video).toHaveCount(0);
    expect(await isSending(page, 'video')).toBe(false);
    await expect.poll(() => call.switched).toEqual([{ micOn: true, cameraOn: false }]);
  });

  // L2-030 AC5, L2-057
  test('the controls work from the keyboard', async ({ page }) => {
    await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.names).toHaveCount(6);

    await video.mute.focus();
    await page.keyboard.press('Space');
    await expect(video.mute).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Tab');
    await expect(video.camera).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(video.camera).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Tab');
    await expect(video.leave).toBeFocused();
  });

  // L2-030 AC6
  test('"Leave" leaves at once and opens the home the member came from', async ({ page }) => {
    const call = await maraWithACall(page, theMocksCall);
    await page.goto(homeUrl);
    await new PopkinHomePage(page).groupCall.click();
    const video = new VideoCallPage(page);
    await expect(video.names).toHaveCount(6);

    await video.leave.click();

    await expect(new PopkinHomePage(page).root).toBeVisible();
    await expect(page).toHaveURL(homeUrl);
    expect(await devicesAreOff(page)).toBe(true);
    await expect.poll(() => call.left).toBe(1);
  });

  // L2-030 AC6
  test('"Leave" opens the Everyone thread when the call was started there', async ({ page }) => {
    await maraWithACall(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await chat.startGroupCall.click();
    const video = new VideoCallPage(page);
    await expect(video.names).toHaveText(['You']);

    await video.leave.click();

    await expect(chat.root).toBeVisible();
    await expect(page).toHaveURL(chatUrl);
  });

  // L2-030 AC6
  test('"Leave" opens the home when the call was opened by its address', async ({ page }) => {
    await maraWithACall(page);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.names).toHaveText(['You']);

    await video.leave.click();

    await expect(page).toHaveURL(homeUrl);
  });

  // L2-030 AC7
  test('"Minimise call" opens the home with the call still running and a banner to return', async ({
    page,
  }) => {
    const call = await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.names).toHaveCount(6);

    await video.minimise.click();

    const banner = new CallBanner(page);
    await expect(new PopkinHomePage(page).root).toBeVisible();
    await expect(page).toHaveURL(homeUrl);
    await expect(banner.text).toHaveText('Group call · 6 on the call');
    await expect(banner.return).toBeVisible();
    expect(await devicesAreOff(page)).toBe(false);
    expect(call.left).toBe(0);

    await banner.return.click();

    await expect(video.names).toHaveCount(6);
    expect(call.joined).toHaveLength(1);
  });

  // L2-029 AC1, the shared real-time rules
  test('after the connection drops and returns, the call is joined again', async ({
    page,
    hub,
  }) => {
    const call = await maraWithACall(page, theMocksCall);
    await page.goto(callUrl);
    const video = new VideoCallPage(page);
    await expect(video.names).toHaveCount(6);
    await hub.connected();

    call.others = [callers.walt];
    await hub.drop();

    await expect(video.names).toHaveText(['Walt', 'You']);
    expect(callOf(page).joined).toHaveLength(2);
  });
});
