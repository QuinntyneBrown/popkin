import { chatUrl, popkinId } from '../fixtures/chat';
import { homeUrl } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { preparing, ready, recapUrl, theMockRecap, wrapUpOf } from '../fixtures/wrap-up';
import { GroupChatPage } from '../pages/group-chat.page';
import { NotFoundPage } from '../pages/not-found.page';
import { RecapPage } from '../pages/recap.page';
import { Toasts } from '../pages/toasts';

// L2-046
test.describe('The recap', () => {
  // AC1, AC2
  test('says the Popkin wrapped up, when it ran and what happened in it', async ({ page }) => {
    await theMockRecap(page);

    await page.goto(recapUrl);

    const recap = new RecapPage(page);
    await expect(recap.heading).toHaveText('This Popkin wrapped up. What a time.');
    await expect(recap.line).toHaveText('Lakeside Weekend · Fri 11 – Sun 13 Sep');
    await expect(recap.prints).toHaveCount(3);
    await expect(recap.collage).toContainText('🏕️');
    await expect(recap.people).toContainText('14 people showed up');
    await expect(recap.people).toContainText('+9');
    await expect(recap.stats).toContainText('1,286');
    await expect(recap.stats).toContainText('messages sent');
    await expect(recap.stats).toContainText('48');
    await expect(recap.stats).toContainText('photos shared');
  });

  // AC3
  test('names the top-rated moment, its score and who shared it, and opens it', async ({
    page,
  }) => {
    await theMockRecap(page);
    await page.goto(recapUrl);
    const recap = new RecapPage(page);

    await expect(recap.moment).toContainText('Top-rated moment');
    await expect(recap.moment).toContainText('Sunrise canoe to Heron Point');
    await expect(recap.moment).toContainText('4.7');
    await expect(recap.moment).toContainText('shared by Mara');

    await recap.momentLink.click();
    await expect(page).toHaveURL(`/p/${popkinId}/experiences/00000000-0000-4000-a000-000000000081`);
  });

  test('has no top-rated moment when nothing was rated', async ({ page }) => {
    await theMockRecap(page, (wrapUp) => (wrapUp.recap.topRated = null));
    await page.goto(recapUrl);
    const recap = new RecapPage(page);

    await expect(recap.people).toBeVisible();
    await expect(recap.moment).toHaveCount(0);
  });

  // AC5, AC6
  test('offers the Host to pop up another with this crew', async ({ page }) => {
    await theMockRecap(page);
    await page.goto(recapUrl);
    const recap = new RecapPage(page);
    await expect(recap.startYourOwn).toHaveCount(0);

    await recap.popUpAnother.click();

    await expect(page).toHaveURL(`/new?crew=${popkinId}`);
  });

  test('offers a member who is not the Host to start their own Popkin', async ({ page }) => {
    await theMockRecap(page, (wrapUp) => wrapUp.asMember());
    await page.goto(recapUrl);
    const recap = new RecapPage(page);
    await expect(recap.popUpAnother).toHaveCount(0);

    await recap.startYourOwn.click();

    await expect(page).toHaveURL('/new');
  });

  // L2-045 AC1
  test('opens the chat to read from "Read the chat", and comes back from it', async ({ page }) => {
    await theMockRecap(page);
    await page.goto(recapUrl);

    await new RecapPage(page).readTheChat.click();

    await expect(page).toHaveURL(chatUrl);
    await expect(new GroupChatPage(page).root).toBeVisible();
  });

  test('goes to My Popkins from its top bar', async ({ page }) => {
    await theMockRecap(page);
    await page.goto(recapUrl);

    await expect(new RecapPage(page).myPopkins).toHaveAttribute('href', '/popkins');
  });

  // L2-056 AC1, AC2
  test('says it is loading until the recap arrives', async ({ page }) => {
    await theMockRecap(page);
    const release = wrapUpOf(page).hold('recap');
    await page.goto(recapUrl);
    const recap = new RecapPage(page);

    await expect(recap.loading).toContainText('Loading the recap…');
    release();
    await expect(recap.heading).toHaveText('This Popkin wrapped up. What a time.');
  });

  test('says so when the recap does not load, and reads it again on "Try again"', async ({
    page,
  }) => {
    await theMockRecap(page, (wrapUp) => wrapUp.break('recap'));
    await page.goto(recapUrl);
    const recap = new RecapPage(page);

    await expect(recap.error).toContainText('We couldn’t load the recap');
    await expect(recap.error).toContainText(
      'It’s all still there. Check your connection and try again.',
    );
    wrapUpOf(page).mend('recap');
    await recap.tryAgain.click();

    await expect(recap.line).toHaveText('Lakeside Weekend · Fri 11 – Sun 13 Sep');
  });

  test('opens the home of a Popkin that has not wrapped up', async ({ page }) => {
    await theMockRecap(page, (wrapUp) => {
      wrapUp.home.popkin = { ...wrapUp.home.popkin, status: 'Active', wrappedUpAt: null };
    });

    await page.goto(recapUrl);

    await expect(page).toHaveURL(homeUrl);
  });

  // L2-051
  test('is not found for someone who is not a member', async ({ page }) => {
    await theMockRecap(page, (wrapUp) => wrapUp.notAMember());

    await page.goto(recapUrl);

    await expect(new NotFoundPage(page).heading).toBeVisible();
  });

  // L2-058 AC11
  test('puts its pictures beside its numbers and actions from 1024 px', async ({ page }) => {
    await theMockRecap(page);
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(recapUrl);
    const recap = new RecapPage(page);
    await expect(recap.people).toBeVisible();

    await expect.poll(() => recap.sideBySide()).toBe(true);
    await page.setViewportSize({ width: 360, height: 800 });
    await expect.poll(() => recap.sideBySide()).toBe(false);
  });
});

// L2-046 AC4
test.describe('Saving the album from the recap', () => {
  test('shows how far the zip is while it is prepared, then downloads it', async ({ page }) => {
    await theMockRecap(page, (wrapUp) => (wrapUp.zip = [preparing(0), preparing(12), ready()]));
    const release = wrapUpOf(page).hold('progress');
    await page.goto(recapUrl);
    const recap = new RecapPage(page);
    const download = page.waitForEvent('download');

    await recap.saveTheAlbum.click();

    await expect(recap.preparing).toBeDisabled();
    await expect(recap.progressText).toHaveText('Preparing 0 of 48');
    await page.clock.runFor(1000);
    release();
    await expect(recap.progressText).toHaveText('Preparing 12 of 48');
    await page.clock.runFor(1000);
    expect((await download).suggestedFilename()).toBe('Lakeside Weekend.zip');
    await expect(recap.saveTheAlbum).toBeEnabled();
    await expect(recap.progress).toHaveCount(0);
    expect(wrapUpOf(page).exportsStarted).toBe(1);
  });

  test('says so when the album cannot be prepared, and can be tried again', async ({ page }) => {
    await theMockRecap(page, (wrapUp) => {
      wrapUp.zip = [ready()];
      wrapUp.break('export');
    });
    await page.goto(recapUrl);
    const recap = new RecapPage(page);

    await recap.saveTheAlbum.click();

    const toasts = new Toasts(page);
    await expect(toasts.toast).toContainText('We couldn’t prepare the album');
    await expect(recap.saveTheAlbum).toBeEnabled();
    wrapUpOf(page).mend('export');
    const download = page.waitForEvent('download');
    await toasts.action('Try again').click();
    await download;
  });

  test('offers no album to save when the Popkin has no photos', async ({ page }) => {
    await theMockRecap(page, (wrapUp) => {
      wrapUp.recap = { ...wrapUp.recap, photoCount: 0, photos: [] };
    });
    await page.goto(recapUrl);
    const recap = new RecapPage(page);

    await expect(recap.readTheChat).toBeVisible();
    await expect(recap.saveTheAlbum).toHaveCount(0);
    await expect(recap.prints).toHaveCount(0);
  });
});

// L2-045 AC4
test.describe('The recap of a Popkin whose album was not kept', () => {
  test('says how many days the photos have left, and saves the album from there', async ({
    page,
  }) => {
    // Wrapped up on Sunday 13 September at 6 pm; read on Tuesday 1 October at 6:30 pm.
    await theMockRecap(page, (wrapUp) => {
      wrapUp.wrap(false);
      wrapUp.zip = [ready()];
    });
    await page.clock.setFixedTime(new Date(2026, 9, 1, 18, 30));
    await page.goto(recapUrl);
    const recap = new RecapPage(page);

    await expect(recap.photosGo).toContainText('Photos go in 12 days.');
    await expect(recap.photosGo).toContainText('Save the album to keep them.');
    const download = page.waitForEvent('download');
    await recap.save.click();
    await download;
  });

  test('has no notice and no album once the photos were removed', async ({ page }) => {
    await theMockRecap(page, (wrapUp) => {
      wrapUp.wrap(false);
      wrapUp.removePhotos();
    });
    await page.goto(recapUrl);
    const recap = new RecapPage(page);

    await expect(recap.people).toBeVisible();
    await expect(recap.photosGo).toHaveCount(0);
    await expect(recap.saveTheAlbum).toHaveCount(0);
    await expect(recap.stats).toContainText('48');
  });
});
