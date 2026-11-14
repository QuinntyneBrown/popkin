import { chatUrl, dockPhoto, maraInTheChat, message, people } from '../fixtures/chat';
import { maraOnTheDock } from '../fixtures/photo-talk';
import { albumUrl, theMockAlbum } from '../fixtures/photos';
import { expect, test } from '../fixtures/pk-test';
import { ChatPhotos } from '../pages/chat-photos';
import { GroupChatPage } from '../pages/group-chat.page';
import { PhotoAlbumPage } from '../pages/photo-album.page';
import { PhotoTalkPage } from '../pages/photo-talk';
import { PhotoViewPage } from '../pages/photo-view.page';

const phone = { width: 360, height: 780 };
const desktop = { width: 1280, height: 900 };

test.describe('reacting to a photo (L2-034)', () => {
  test('offers five quick reactions and More reactions (AC1)', async ({ page }) => {
    const { url } = await maraOnTheDock(page);
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    for (const name of ['Heart', 'Laughing', 'Heart eyes', 'Fire', 'Clapping']) {
      await expect(talk.quick(name)).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(talk.moreReactions).toBeVisible();
  });

  test('a reaction counts one more, pressed and filled; again, it is taken back (AC2, AC3)', async ({
    page,
  }) => {
    const { url, talk: server } = await maraOnTheDock(page);
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await talk.quick('Heart').click();
    await expect(talk.quick('Heart')).toHaveAttribute('aria-pressed', 'true');
    await expect(talk.chip('Heart')).toHaveAccessibleName('Heart, 10, you reacted');

    await talk.quick('Heart').click();
    await expect(talk.quick('Heart')).toHaveAttribute('aria-pressed', 'false');
    await expect(talk.chip('Heart')).toHaveAccessibleName('Heart, 9');
    expect(server.reacted).toEqual([
      { method: 'PUT', emoji: '❤️' },
      { method: 'DELETE', emoji: '❤️' },
    ]);
  });

  test('works by the keyboard', async ({ page }) => {
    const { url } = await maraOnTheDock(page);
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await talk.quick('Fire').focus();
    await page.keyboard.press('Enter');

    await expect(talk.chip('Fire')).toHaveAccessibleName('Fire, 1, you reacted');
  });

  test('More reactions gives one of the others', async ({ page }) => {
    const { url } = await maraOnTheDock(page);
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await talk.moreReactions.click();
    await talk.picker.getByRole('button', { name: 'Party popper' }).click();

    await expect(talk.chip('Party popper')).toHaveAccessibleName('Party popper, 1, you reacted');
  });

  test('a reaction that fails puts the count back and says so (AC4)', async ({ page }) => {
    const { url, talk: server } = await maraOnTheDock(page);
    server.fail('react');
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await talk.quick('Heart').click();

    await expect(talk.says('We couldn’t save your reaction.')).toBeVisible();
    await expect(talk.chip('Heart')).toHaveAccessibleName('Heart, 9');
    await expect(talk.quick('Heart')).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('commenting on a photo (L2-035)', () => {
  test('on a phone, Comment opens the comments oldest first (AC1)', async ({ page }) => {
    await page.setViewportSize(phone);
    const { url } = await maraOnTheDock(page);
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await talk.comment.click();

    await expect(talk.dialog).toHaveAccessibleName('3 comments');
    await expect(talk.dialogComments).toHaveCount(3);
    await expect(talk.dialogComments.first()).toContainText('Walt');
    await expect(talk.dialogComments.first()).toContainText('Sat 7:40');
    await expect(talk.dialogComments.first()).toContainText('That dock! Wish I’d been up for it.');
    await expect(talk.dialogComments.last()).toContainText('Dev');
  });

  test('on a desktop, the same comments are beside the photo, with the field', async ({ page }) => {
    await page.setViewportSize(desktop);
    const { url } = await maraOnTheDock(page);
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await expect(talk.panelComments).toHaveCount(3);
    await expect(talk.panelComments.first()).toContainText('That dock!');
    await expect(talk.panelField).toBeVisible();
    await talk.comment.click();
    await expect(talk.panelField).toBeFocused();
    await expect(talk.dialog).toHaveCount(0);
  });

  test('a comment sent appears at the end and the count goes up (AC2)', async ({ page }) => {
    await page.setViewportSize(phone);
    const { url, talk: server } = await maraOnTheDock(page);
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await talk.comment.click();
    await talk.dialogField.fill('  Up at 6 again tomorrow?  ');
    await talk.dialogPost.click();

    await expect(talk.dialogComments).toHaveCount(4);
    await expect(talk.dialogComments.last()).toContainText('Up at 6 again tomorrow?');
    await expect(talk.dialog).toHaveAccessibleName('4 comments');
    await expect(talk.dialogField).toHaveValue('');
    expect(server.posted).toEqual(['Up at 6 again tomorrow?']);
  });

  test('a comment sent from the panel appears in it (AC2)', async ({ page }) => {
    await page.setViewportSize(desktop);
    const { url } = await maraOnTheDock(page);
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await talk.panelField.fill('Same time tomorrow');
    await talk.panelPost.click();

    await expect(talk.panelComments).toHaveCount(4);
    await expect(talk.panelComments.last()).toContainText('Same time tomorrow');
  });

  test('takes no more than 500 characters and shows a count near the limit (AC3)', async ({
    page,
  }) => {
    await page.setViewportSize(phone);
    const { url } = await maraOnTheDock(page);
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await talk.comment.click();
    await talk.dialogField.fill('a'.repeat(449));
    await expect(talk.dialogCount).toHaveCount(0);
    await talk.dialogField.pressSequentially('bcd');
    await expect(talk.dialogCount).toHaveText('452 / 500');
    await expect(talk.dialogField).toHaveAttribute('maxlength', '500');
  });

  test('with no comments, invites the first (AC4)', async ({ page }) => {
    await page.setViewportSize(phone);
    const { url } = await maraOnTheDock(page, (dock) => (dock.comments = []));
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await talk.comment.click();

    await expect(talk.dialog).toHaveAccessibleName('Comments');
    await expect(talk.dialogEmpty).toBeVisible();
    await expect(talk.dialog).toContainText('Be the first to say something about this one.');
  });

  test('the member deletes their own comment after confirming (AC5)', async ({ page }) => {
    await page.setViewportSize(phone);
    const { url, talk: server } = await maraOnTheDock(page, (dock) =>
      dock.comments?.push({
        id: 'c-mara',
        by: people.mara,
        addedAt: new Date(2026, 8, 12, 8, 30),
        text: 'Up at 6 again tomorrow?',
      }),
    );
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await talk.comment.click();
    await expect(talk.deleteOf(talk.dialogComments.first())).toHaveCount(0);
    await talk.deleteOf(talk.dialogComments.last()).click();
    await talk.confirmCommentDelete.click();

    await expect(talk.dialogComments).toHaveCount(3);
    expect(server.deletedComments).toEqual(['c-mara']);
  });
});

test.describe('saving and deleting a photo (L2-036)', () => {
  test('Save photo downloads it (AC1)', async ({ page }) => {
    const { url, talk: server } = await maraOnTheDock(page);
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    const download = page.waitForEvent('download');
    await talk.save.click();

    expect((await download).suggestedFilename()).toBe('popkin-photo-20260912-0658.jpg');
    expect(server.saves).toBe(1);
  });

  test('a save that fails says so', async ({ page }) => {
    const { url, talk: server } = await maraOnTheDock(page);
    server.fail('save');
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await talk.save.click();

    await expect(talk.says('We couldn’t save this photo.')).toBeVisible();
  });

  test('the member deletes their own photo after confirming, and goes to Photos (AC2)', async ({
    page,
  }) => {
    const { url, dock, talk: server } = await maraOnTheDock(page);
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await talk.actions.click();
    await talk.deletePhoto.click();
    await talk.confirmPhotoDelete.click();

    await expect(page).toHaveURL(albumUrl);
    await expect(talk.says('Photo deleted.')).toBeVisible();
    const album = new PhotoAlbumPage(page);
    await expect(album.thumbnailOf(theMockAlbum()[1].id)).toBeVisible();
    await expect(album.thumbnailOf(dock.id)).toHaveCount(0);
    expect(server.deletedPhotos).toEqual([dock.id]);
  });

  test('a delete that fails keeps the photo and says so', async ({ page }) => {
    const { url, talk: server } = await maraOnTheDock(page);
    server.fail('delete');
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await talk.actions.click();
    await talk.deletePhoto.click();
    await talk.confirmPhotoDelete.click();

    await expect(talk.confirmPhotoProblem).toContainText('We couldn’t delete this photo.');
    await expect(new PhotoViewPage(page).root).toBeAttached();
  });

  test('offers no Photo actions on a photo the member may not delete (AC2)', async ({ page }) => {
    const { url } = await maraOnTheDock(page, (dock) => (dock.canDelete = false));
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await expect(talk.save).toBeVisible();
    await expect(talk.actions).toHaveCount(0);
  });

  test('a photo deleted while it is open says it was removed (AC3)', async ({ page }) => {
    const { url, dock, talk: server } = await maraOnTheDock(page);
    await page.goto(url);
    const talk = new PhotoTalkPage(page);
    await expect(talk.save).toBeVisible();

    await server.deletedBySomeone(dock);

    await expect(talk.removed).toBeVisible();
    await expect(talk.backToPhotos).toHaveAttribute('href', albumUrl);
  });

  test('a chat message whose photo was deleted reads "Photo removed" (AC3)', async ({ page }) => {
    await maraInTheChat(page, (chat) =>
      chat.messages.push(
        message(people.dev, 'Pancakes are up', new Date(), { photo: null, photoRemoved: true }),
      ),
    );
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);

    const removed = chat.message('Pancakes are up');
    await expect(new ChatPhotos(page).removed(removed)).toBeVisible();
    await expect(new ChatPhotos(page).photo(removed)).toHaveCount(0);
  });

  test('a photo deleted while the chat is open turns into "Photo removed" (AC3)', async ({
    page,
    hub,
  }) => {
    const thread = await maraInTheChat(page);
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    const photos = new ChatPhotos(page);
    const dev = chat.message('Dock was glass this morning');
    await expect(photos.photo(dev)).toBeVisible();
    await hub.connected();

    await thread.photoDeleted(hub, dockPhoto.id);

    await expect(photos.removed(dev)).toBeVisible();
    await expect(photos.photo(dev)).toHaveCount(0);
  });
});

test.describe('in a Popkin that has wrapped up (L2-045)', () => {
  test('shows reactions and comments, and offers no react bar, field or Delete', async ({
    page,
  }) => {
    await page.setViewportSize(desktop);
    const { url } = await maraOnTheDock(page, (_dock, _album, home) => {
      home.popkin.status = 'WrappedUp';
      home.popkin.wrappedUpAt = new Date(2026, 8, 12, 11).toISOString();
    });
    await page.goto(url);
    const talk = new PhotoTalkPage(page);

    await expect(talk.chip('Heart')).toBeVisible();
    await expect(talk.panelComments).toHaveCount(3);
    await expect(talk.reactBar).toHaveCount(0);
    await expect(talk.panelField).toHaveCount(0);
    await expect(talk.save).toBeVisible();
    await expect(talk.actions).toHaveCount(0);
  });
});
