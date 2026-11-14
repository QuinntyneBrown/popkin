import {
  chatUrl,
  directUrl,
  dockPhoto,
  maraInTheChat,
  message,
  people,
  theMockThread,
} from '../fixtures/chat';
import { maraAtHome } from '../fixtures/home';
import { aBigPhoto, aFileOf, aPhoto, withTheAlbum } from '../fixtures/photos';
import { expect, test } from '../fixtures/pk-test';
import { ChatPhotos } from '../pages/chat-photos';
import { DirectMessagePage } from '../pages/direct-message.page';
import { GroupChatPage } from '../pages/group-chat.page';
import { PhotoViewPage } from '../pages/photo-view.page';

const devs = 'Dock was glass this morning';

test.describe('choosing a photo (L2-026 AC1)', () => {
  test('shows it above the field with Remove photo, and Send with no text', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const photos = new ChatPhotos(page);

    await photos.pick(aPhoto('lake.jpg'));

    await expect(photos.preview).toBeVisible();
    await expect(photos.remove).toBeVisible();
    await expect(chat.field).toHaveValue('');
    await expect(chat.send).toBeEnabled();
  });

  test('Remove photo takes it away', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const photos = new ChatPhotos(page);

    await photos.pick(aPhoto('lake.jpg'));
    await photos.remove.click();

    await expect(photos.preview).toHaveCount(0);
    await expect(chat.send).toBeDisabled();
  });

  test('is reached by the keyboard, Photo and Remove photo alike', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const photos = new ChatPhotos(page);

    await photos.choose.focus();
    const chooser = page.waitForEvent('filechooser');
    await page.keyboard.press('Enter');
    await (await chooser).setFiles(aPhoto('lake.jpg'));
    await photos.remove.focus();
    await page.keyboard.press('Enter');

    await expect(photos.preview).toHaveCount(0);
  });
});

test.describe('the limits of the album (L2-026 AC4, L2-031 AC2)', () => {
  test('a file over 10 MB is refused, saying why, and nothing is previewed', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const photos = new ChatPhotos(page);

    await photos.pick(aBigPhoto(14, 'lake.jpg'));

    await expect(photos.refusal).toContainText('This file is 14 MB. Photos can be up to 10 MB.');
    await expect(photos.preview).toHaveCount(0);
  });

  test('a file that is not a photo is refused, saying why', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const photos = new ChatPhotos(page);

    await photos.pick(aFileOf(1, 'menu.pdf', 'application/pdf'));

    await expect(photos.refusal).toContainText('JPEG, PNG, WebP or HEIC');
    await photos.dismiss.click();
    await expect(photos.refusal).toHaveCount(0);
  });

  test('a photo the server refuses leaves the message Not sent', async ({ page }) => {
    const thread = await maraInTheChat(page, (chat) => (chat.refuseUploads = 'photo_too_large'));
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const photos = new ChatPhotos(page);

    await photos.pick(aPhoto('lake.jpg'));
    await chat.send.click();

    await expect(chat.statusOf(chat.messages.last())).toContainText('Not sent');
    expect(thread.sent).toEqual([]);
  });
});

test.describe('sending a photo (L2-026 AC1, AC2)', () => {
  test('with no text: uploaded, then sent, and shown as the member’s own', async ({ page }) => {
    const thread = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const photos = new ChatPhotos(page);

    await photos.pick(aPhoto('lake.jpg'));
    await chat.send.click();

    const mine = chat.messages.last();
    await expect(photos.photo(mine)).toHaveAccessibleName('Open your photo');
    await expect(photos.image(mine)).toHaveAttribute('alt', 'Your photo');
    await expect(photos.preview).toHaveCount(0);
    await expect.poll(() => thread.sent.length).toBe(1);
    expect(thread.uploaded).toHaveLength(1);
    expect(thread.sent[0]).toMatchObject({ text: '', photoId: expect.any(String) });
  });

  test('with text: the text shows under the photo', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const photos = new ChatPhotos(page);

    await photos.pick(aPhoto('lake.jpg'));
    await chat.sendWithEnter('Look at the lake');

    const mine = chat.message('Look at the lake');
    await expect(photos.photo(mine)).toBeVisible();
    const photo = await photos.image(mine).boundingBox();
    const text = await mine.locator('.bubble > p').boundingBox();
    expect(text && photo && text.y >= photo.y + photo.height).toBe(true);
  });

  for (const width of [360, 1280]) {
    test(`shows at most 16 rem wide at 4:3 at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await maraInTheChat(page);
      await page.goto(chatUrl);
      const dev = new GroupChatPage(page).message(devs);

      const box = await new ChatPhotos(page).image(dev).boundingBox();
      expect(box?.width).toBeLessThanOrEqual(256);
      expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(4 / 3, 1);
    });
  }

  test('names someone else’s photo after them', async ({ page }) => {
    await maraInTheChat(page);
    await page.goto(chatUrl);
    const dev = new GroupChatPage(page).message(devs);
    const photos = new ChatPhotos(page);

    await expect(photos.photo(dev)).toHaveAccessibleName('Open photo from Dev');
    await expect(photos.image(dev)).toHaveAttribute('alt', 'Photo from Dev');
  });

  test('choosing it opens the photo full screen', async ({ page }) => {
    await maraInTheChat(page);
    // Sent in Everyone, Dev's photo is in the album too (L2-026 AC3).
    const album = await withTheAlbum(page);
    album.shots = [
      { ...album.shots[0], id: dockPhoto.id, caption: null, by: people.dev },
      ...album.shots,
    ];
    await page.goto(chatUrl);

    await new ChatPhotos(page).photo(new GroupChatPage(page).message(devs)).click();

    await expect(page).toHaveURL(new RegExp(`/photos/${dockPhoto.id}$`));
    await expect(new PhotoViewPage(page).root).toBeAttached();
  });

  test('a photo someone sends arrives as it is sent', async ({ page, hub }) => {
    const thread = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await expect(chat.message(devs)).toBeVisible();
    await hub.connected();

    await thread.arrives(
      hub,
      message(people.walt, 'Pancakes are up', new Date(), { photo: { ...dockPhoto, id: 'x' } }),
    );

    await expect(new ChatPhotos(page).photo(chat.message('Pancakes are up'))).toHaveAccessibleName(
      'Open photo from Walt',
    );
  });
});

test.describe('in a direct message (L2-023 AC3)', () => {
  test('sends a photo the same way', async ({ page }) => {
    await maraAtHome(page);
    await page.goto(directUrl(people.walt));
    const dm = new DirectMessagePage(page);
    const photos = new ChatPhotos(page);

    await photos.pick(aPhoto('lake.jpg'));
    await dm.field.fill('For you');
    await dm.field.press('Enter');

    await expect(photos.photo(dm.message('For you'))).toHaveAccessibleName('Open your photo');
  });
});

test.describe('in a Popkin that has wrapped up (L2-045)', () => {
  test('offers no Photo, and the photos still open', async ({ page }) => {
    await maraInTheChat(page, (chat) => {
      chat.thread.readOnly = true;
      chat.messages = theMockThread();
    });
    await page.goto(chatUrl);
    const photos = new ChatPhotos(page);

    await expect(photos.photo(new GroupChatPage(page).message(devs))).toBeVisible();
    await expect(photos.choose).toHaveCount(0);
  });
});
