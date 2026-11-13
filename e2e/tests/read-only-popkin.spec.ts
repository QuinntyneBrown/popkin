import { chatUrl, popkinId } from '../fixtures/chat';
import {
  canoeId,
  experienceUrl,
  experiencesUrl,
  maraWithExperiences,
} from '../fixtures/experiences';
import { previewKey, recordedPreview } from '../fixtures/journeys';
import { albumUrl, maraInTheAlbum } from '../fixtures/photos';
import { expect, test } from '../fixtures/pk-test';
import { answer } from '../fixtures/stubs';
import { maraWithWrapUp, photosRemoved, recapUrl, wrappedUp } from '../fixtures/wrap-up';
import { ExperienceDetailPage } from '../pages/experience-detail.page';
import { ExperiencesPage } from '../pages/experiences.page';
import { GroupChatPage } from '../pages/group-chat.page';
import { PhotoAlbumPage } from '../pages/photo-album.page';
import { WrapUpBanner } from '../pages/wrap-up-banner';

// L2-045
test.describe('The chat of a wrapped-up Popkin', () => {
  // AC1
  test('keeps every message, and says nobody can post in place of the composer', async ({
    page,
  }) => {
    await maraWithWrapUp(page, (wrapUp) => wrapUp.wrap());

    await page.goto(chatUrl);

    const chat = new GroupChatPage(page);
    await expect(chat.messages.first()).toBeVisible();
    await expect(chat.closed).toHaveText(
      'This Popkin has wrapped up. Messages stay, but nobody can post new ones.',
    );
    await expect(chat.field).toHaveCount(0);
    await expect(chat.sub).toHaveText('Wrapped up Sun 13 Sep');
  });

  test('offers no call, and goes back to the recap on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await maraWithWrapUp(page, (wrapUp) => wrapUp.wrap());
    await page.goto(chatUrl);
    const chat = new GroupChatPage(page);
    await expect(chat.closed).toBeVisible();

    await expect(chat.startCall).toHaveCount(0);
    await chat.backToRecap.click();

    await expect(page).toHaveURL(recapUrl);
  });
});

test.describe('The photos of a wrapped-up Popkin', () => {
  // AC3
  test('can be browsed, and none can be added', async ({ page }) => {
    await maraInTheAlbum(page, (_, home) => wrappedUp(home));

    await page.goto(albumUrl);

    const album = new PhotoAlbumPage(page);
    await expect(album.thumbnails.first()).toBeVisible();
    await expect(album.addInHeader).toHaveCount(0);
    await expect(album.addFloating).toHaveCount(0);
    await expect(new WrapUpBanner(page).root).toHaveCount(0);
  });

  // AC4
  test('says how many days are left when the album was not kept, and where to save it', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date(2026, 9, 1, 18, 30) });
    await maraInTheAlbum(page, (_, home) => wrappedUp(home, false));

    await page.goto(albumUrl);

    const notice = new WrapUpBanner(page);
    await expect(notice.root).toContainText('Photos go in 12 days.');
    await expect(notice.root).toContainText('Save the album to keep them.');
    await expect(notice.action).toHaveAttribute('href', recapUrl);
    await expect(new PhotoAlbumPage(page).thumbnails.first()).toBeVisible();
  });

  test('says the photos were removed once they are', async ({ page }) => {
    await maraInTheAlbum(page, (album, home) => {
      wrappedUp(home, false);
      photosRemoved(home);
      album.empty();
    });

    await page.goto(albumUrl);

    const album = new PhotoAlbumPage(page);
    await expect(album.emptyHeading).toHaveText('The photos were removed');
    await expect(album.empty).toContainText(
      'The album wasn’t kept when Lakeside Weekend wrapped up, so its photos went after 30 days. The chat and the experiences are still here.',
    );
    await expect(album.summary).toHaveText('No photos');
    await expect(album.addFirst).toHaveCount(0);
    await expect(album.seeTheRecap).toHaveAttribute('href', recapUrl);
  });
});

test.describe('The experiences of a wrapped-up Popkin', () => {
  test('can be read, and none can be shared', async ({ page }) => {
    await maraWithExperiences(page, (all, home) => {
      all.wrappedUp = true;
      wrappedUp(home);
    });

    await page.goto(experiencesUrl);

    const experiences = new ExperiencesPage(page);
    await expect(experiences.titles.first()).toBeVisible();
    await expect(experiences.shareOne).toHaveCount(0);
  });

  test('keep their score and comments, with nothing to rate, say or change', async ({ page }) => {
    await maraWithExperiences(page, (all, home) => {
      all.wrappedUp = true;
      wrappedUp(home);
    });

    await page.goto(experienceUrl(canoeId));

    const detail = new ExperienceDetailPage(page);
    await expect(detail.scoreCard).toBeVisible();
    await expect(detail.commentsHeading).toBeVisible();
    await expect(detail.ratingPanel).toHaveCount(0);
    await expect(detail.actions).toHaveCount(0);
  });
});

// L2-016 AC3
test.describe('The invite link of a wrapped-up Popkin', () => {
  test('opens the recap for someone who is a member', async ({ page, pk }) => {
    await maraWithWrapUp(page, (wrapUp) => wrapUp.wrap());
    await answer(page, previewKey, {
      status: 200,
      body: {
        ...recordedPreview,
        state: 'WrappedUp',
        viewer: { isMember: true, popkinId },
      },
    });

    await pk.open('joinInvite');

    await expect(page).toHaveURL(recapUrl);
  });
});
