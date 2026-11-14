import { chatUrl, popkinId } from '../fixtures/chat';
import { homeNow, homeUrl } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { albumUrl, maraInTheAlbum } from '../fixtures/photos';
import type { Hub } from '../fixtures/hub';
import { type Settings, maraWithSettings, settingsOf } from '../fixtures/settings';
import { GroupChatPage } from '../pages/group-chat.page';
import { PhotoAlbumPage } from '../pages/photo-album.page';
import { PopkinHomePage } from '../pages/popkin-home.page';

const campfire = { name: 'Campfire Nights', emoji: '🎉', colour: 'Plum' };

/**
 * The home reads itself again once the hub has connected (the shared real-time rules); a change
 * pushed only after that read proves the event, not the read, brought it.
 */
async function caughtUp(settings: Settings, hub: Hub): Promise<void> {
  await hub.connected();
  await expect.poll(() => settings.home.asked.popkin).toBeGreaterThanOrEqual(2);
}

// L2-020 AC3, AC4: what the Host saves reaches every member's open screens without a reload.
test.describe('A Popkin whose Host changes it while it is open', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: homeNow });
  });

  test('shows a member its new name, emoji and colour on the home', async ({ page, hub }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const settings = await maraWithSettings(page, (home) => {
      home.popkin = { ...home.popkin, viewerRole: 'Member' };
    });
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    await expect(home.heading).toHaveText('Lakeside Weekend');
    await caughtUp(settings, hub);

    await settings.changedElsewhere(hub, campfire);

    await expect(home.heading).toHaveText('Campfire Nights');
    await expect(home.tile).toHaveText('🎉');
    await expect(home.screen).toHaveAttribute('data-accent', 'plum');
    await expect(home.sidebarName).toHaveText('Campfire Nights');
  });

  test('shows a member the new time left', async ({ page, hub }) => {
    const settings = await maraWithSettings(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    await expect(home.timeLeft).toHaveText('1 day 6 hrs left · Wraps up Sun, 6 pm');
    await caughtUp(settings, hub);

    await settings.changedElsewhere(hub, {
      length: 'UntilDate',
      endsAt: new Date(2026, 8, 14, 18, 0).toISOString(),
    });

    await expect(home.timeLeft).toHaveText('2 days 6 hrs left · Wraps up Mon, 6 pm');
  });

  test('takes the time left away when it keeps going', async ({ page, hub }) => {
    const settings = await maraWithSettings(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    await expect(home.timeLeft).toBeVisible();
    await caughtUp(settings, hub);

    await settings.changedElsewhere(hub, { length: 'KeepItGoing', endsAt: null });

    await expect(home.timeLeft).toHaveCount(0);
  });

  test('shows the new name in the Everyone thread', async ({ page, hub }) => {
    const settings = await maraWithSettings(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await expect(chat.heading).toHaveText('Lakeside Weekend');
    await hub.connected();

    await settings.changedElsewhere(hub, campfire);

    await expect(chat.heading).toHaveText('Campfire Nights');
  });

  test('shows the new name beside the album', async ({ page, hub }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await maraInTheAlbum(page);
    const settings = await settingsOf(page);
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);
    await expect(album.sidebarName).toHaveText('Lakeside Weekend');
    await hub.connected();

    await settings.changedElsewhere(hub, campfire);

    await expect(album.sidebarName).toHaveText('Campfire Nights');
  });

  test('keeps what it shows when a change older than it arrives late', async ({ page, hub }) => {
    const settings = await maraWithSettings(page);
    settings.home.popkin = { ...settings.home.popkin, version: 5 };
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    await expect(home.heading).toHaveText('Lakeside Weekend');
    await caughtUp(settings, hub);

    await hub.push('PopkinChanged', popkinId, {
      id: popkinId,
      ...campfire,
      length: 'TheWeekend',
      endsAt: settings.home.popkin.endsAt,
      version: 4,
    });
    await settings.changedElsewhere(hub, { name: 'Lakeside Long Weekend' });

    await expect(home.heading).toHaveText('Lakeside Long Weekend');
    await expect(home.tile).toHaveText('🏕️');
  });
});
