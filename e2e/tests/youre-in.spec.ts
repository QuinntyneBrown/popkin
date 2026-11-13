import { withTheAlbum } from '../fixtures/photos';
import { PhotoAlbumPage } from '../pages/photo-album.page';
import responses from '../fixtures/api/responses.json';
import { asJoel, asVisitor, inviteCode, joelJustJoined, lakesideCast } from '../fixtures/journeys';
import { maraInTheChat } from '../fixtures/chat';
import { expect, test } from '../fixtures/pk-test';
import { GroupChatPage } from '../pages/group-chat.page';
import { JoinInvitePage } from '../pages/join-invite.page';
import { YoureInPage } from '../pages/youre-in.page';

const created = responses['POST /api/popkins'].body;

test.describe('the welcome after joining', () => {
  test.beforeEach(async ({ page }) => {
    await asJoel(page);
  });

  // L2-014 AC1
  test('welcomes you by name, says who you are with and offers the chat and the photos', async ({
    page,
  }) => {
    await joelJustJoined(page);
    const welcome = new YoureInPage(page);

    await expect(page).toHaveURL(`/i/${inviteCode}/welcome`);
    await expect(welcome.heading).toHaveText('Welcome in, Joel!');
    await expect(welcome.line).toHaveText(
      'You’re now part of Lakeside Weekend, with Mara, Walt and 1 other.',
    );
    await expect(welcome.tile).toHaveText('🏕️');
    await expect(welcome.screen).toHaveAttribute('data-accent', 'teal');
    await expect(welcome.avatars).toHaveText(['MO', 'WB', 'DP']);
    await expect(welcome.sayHi).toHaveAttribute('href', `/p/${created.id}/chat/everyone`);
    await expect(welcome.seeThePhotos).toHaveAttribute('href', `/p/${created.id}/photos`);
  });

  // L2-014 AC1
  test('names two members and counts the rest of a bigger Popkin', async ({ page }) => {
    await lakesideCast(page);
    await joelJustJoined(page);
    const welcome = new YoureInPage(page);

    await expect(welcome.line).toHaveText(
      'You’re now part of Lakeside Weekend, with Mara, Walt and 12 others.',
    );
    await expect(welcome.avatars).toHaveCount(6);
  });

  // L2-014 AC2
  test('Say hi to everyone opens the Everyone thread with focus in the message field', async ({
    page,
  }) => {
    await maraInTheChat(page);
    await joelJustJoined(page);
    const welcome = new YoureInPage(page);

    await welcome.sayHi.click();

    await expect(page).toHaveURL(`/p/${created.id}/chat/everyone`);
    const chat = new GroupChatPage(page);
    await expect(chat.notes).toHaveText(['Joel popped in. Say hi! 👋']);
    await expect(chat.field).toBeFocused();
  });

  // L2-014 AC3
  test('See the photos opens Photos', async ({ page }) => {
    await joelJustJoined(page);
    await withTheAlbum(page);
    const welcome = new YoureInPage(page);

    await welcome.seeThePhotos.click();

    await expect(page).toHaveURL(`/p/${created.id}/photos`);
    await expect(new PhotoAlbumPage(page).heading).toHaveText('Photos');
  });

  test('the confetti bursts', async ({ page }) => {
    await joelJustJoined(page);
    const welcome = new YoureInPage(page);

    await expect(welcome.confetti).toHaveCount(12);
    await expect(welcome.confetti.first()).toBeVisible();
  });

  // L2-014 AC5, L2-060 AC1
  test('no confetti under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await joelJustJoined(page);
    const welcome = new YoureInPage(page);

    await expect(welcome.heading).toHaveText('Welcome in, Joel!');
    await expect(welcome.confetti.filter({ visible: true })).toHaveCount(0);
  });

  test('opened again later, it goes back to the invite, which knows where a member belongs', async ({
    page,
    pk,
  }) => {
    await pk.open('youreIn');

    await expect(page).toHaveURL(`/i/${inviteCode}`);
    await expect(new JoinInvitePage(page).heading).toHaveText('Lakeside Weekend');
  });

  // L2-058 AC2
  test('on a phone the two actions stack', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await joelJustJoined(page);
    const welcome = new YoureInPage(page);

    await expect(welcome.sayHi).toBeInViewport();
    await expect(welcome.seeThePhotos).toBeInViewport();
    expect(await welcome.actionsShareALine()).toBe(false);
  });

  // L2-058
  test('from 640 px the two actions sit side by side', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    await joelJustJoined(page);
    const welcome = new YoureInPage(page);

    await expect(welcome.sayHi).toBeVisible();
    expect(await welcome.actionsShareALine()).toBe(true);
  });
});

// L2-007 AC2
test('the welcome needs a session', async ({ page, pk }) => {
  await asVisitor(page);
  await pk.open('youreIn');

  await expect(page).toHaveURL(
    `/sign-in?returnUrl=${encodeURIComponent(`/i/${inviteCode}/welcome`)}`,
  );
});
