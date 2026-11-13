import { homeUrl } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { maraWithWrapUp, recapUrl, wrapUpOf, wrapUpUrl } from '../fixtures/wrap-up';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { RecapPage } from '../pages/recap.page';
import { WrapUpPage } from '../pages/wrap-up.page';

// L2-043
test.describe('Wrap up', () => {
  test('asks the Host, says whom it affects and what follows', async ({ page }) => {
    await maraWithWrapUp(page);

    await page.goto(wrapUpUrl);

    const wrapUp = new WrapUpPage(page);
    await expect(wrapUp.heading).toHaveText('Wrap up Lakeside Weekend?');
    await expect(wrapUp.lead).toHaveText(
      'Every good Popkin ends. Here’s what happens next for all 14 of you.',
    );
    await expect(wrapUp.factRows).toHaveText([
      /Everyone gets a recap.*The people, the photos, the best-rated moment\. A proper send-off\./,
      /Chat goes quiet.*Messages stay readable, but nobody can post new ones\./,
    ]);
    await expect(wrapUp.wrapItUp).toHaveText('Wrap it up');
    await expect(wrapUp.wrapItUp).toBeEnabled();
  });

  // AC2
  test('keeps the photo album unless the Host turns that off, and says what each means', async ({
    page,
  }) => {
    await maraWithWrapUp(page);
    await page.goto(wrapUpUrl);
    const wrapUp = new WrapUpPage(page);

    await expect(wrapUp.keepAlbum).toHaveAttribute('aria-checked', 'true');
    await expect(wrapUp.keepLine).toHaveText('Members can keep browsing and saving');

    await wrapUp.keepAlbum.focus();
    await page.keyboard.press('Space');

    await expect(wrapUp.keepAlbum).toHaveAttribute('aria-checked', 'false');
    await expect(wrapUp.keepLine).toHaveText('Photos are removed after 30 days');
  });

  // AC3
  test('reads "Wrapping up…" while it is sent, then opens the recap', async ({ page }) => {
    await maraWithWrapUp(page);
    const release = wrapUpOf(page).hold('wrapUp');
    await page.goto(wrapUpUrl);
    const wrapUp = new WrapUpPage(page);

    await wrapUp.wrapItUp.click();

    await expect(wrapUp.wrapItUp).toHaveText('Wrapping up…');
    await expect(wrapUp.wrapItUp).toBeDisabled();
    await expect(wrapUp.keepAlbum).toBeDisabled();
    release();
    await expect(page).toHaveURL(recapUrl);
    await expect(new RecapPage(page).root).toBeVisible();
    expect(wrapUpOf(page).sent).toEqual([{ keepPhotos: true }]);
    await page.goBack();
    await expect(page).not.toHaveURL(wrapUpUrl);
  });

  test('sends the choice not to keep the album', async ({ page }) => {
    await maraWithWrapUp(page);
    await page.goto(wrapUpUrl);
    const wrapUp = new WrapUpPage(page);
    await wrapUp.keepAlbum.click();

    await wrapUp.wrapItUp.click();

    await expect(page).toHaveURL(recapUrl);
    expect(wrapUpOf(page).sent).toEqual([{ keepPhotos: false }]);
  });

  // AC4
  for (const way of ['Not yet', 'Back'] as const) {
    test(`changes nothing and opens the Popkin home on "${way}"`, async ({ page }) => {
      await maraWithWrapUp(page);
      await page.goto(wrapUpUrl);
      const wrapUp = new WrapUpPage(page);

      await (way === 'Back' ? wrapUp.back : wrapUp.notYet).click();

      await expect(page).toHaveURL(homeUrl);
      await expect(new PopkinHomePage(page).heading).toBeVisible();
      expect(wrapUpOf(page).sent).toEqual([]);
    });
  }

  // AC5
  test('says so when it fails, keeps the choice and can be tried again', async ({ page }) => {
    await maraWithWrapUp(page, (wrapUp) => wrapUp.break('wrapUp'));
    await page.goto(wrapUpUrl);
    const wrapUp = new WrapUpPage(page);
    await wrapUp.keepAlbum.click();

    await wrapUp.wrapItUp.click();

    await expect(wrapUp.alert).toContainText('We couldn’t wrap it up.');
    await expect(wrapUp.alert).toContainText(
      'Lakeside Weekend is still open and nothing has changed. Try again in a moment.',
    );
    await expect(wrapUp.wrapItUp).toBeEnabled();
    await expect(wrapUp.wrapItUp).toHaveText('Wrap it up');
    await expect(wrapUp.keepAlbum).toHaveAttribute('aria-checked', 'false');

    wrapUpOf(page).mend('wrapUp');
    await wrapUp.wrapItUp.click();
    await expect(page).toHaveURL(recapUrl);
  });

  // AC6
  test('sends a member who is not the Host to the Popkin home', async ({ page }) => {
    await maraWithWrapUp(page, (wrapUp) => wrapUp.asMember());

    await page.goto(wrapUpUrl);

    await expect(page).toHaveURL(homeUrl);
  });

  test('opens the recap of a Popkin that has already wrapped up', async ({ page }) => {
    await maraWithWrapUp(page, (wrapUp) => wrapUp.wrap());

    await page.goto(wrapUpUrl);

    await expect(page).toHaveURL(recapUrl);
  });

  test('opens the recap when the Popkin wrapped up a moment before', async ({ page }) => {
    await maraWithWrapUp(page);
    await page.goto(wrapUpUrl);
    const wrapUp = new WrapUpPage(page);
    await expect(wrapUp.wrapItUp).toBeEnabled();
    wrapUpOf(page).wrap();

    await wrapUp.wrapItUp.click();

    await expect(page).toHaveURL(recapUrl);
  });

  // L2-058 AC10
  test('shows the recap it will make beside the question from 768 px', async ({ page }) => {
    await maraWithWrapUp(page);
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(wrapUpUrl);
    const wrapUp = new WrapUpPage(page);

    await expect(wrapUp.picture).toBeVisible();
    await expect(wrapUp.picture).toContainText(
      'The recap everyone gets · 48 photos, 1,286 messages',
    );

    await page.setViewportSize({ width: 360, height: 800 });
    await expect(wrapUp.picture).toBeHidden();
  });

  test('says so when what it shows cannot be read, and can be tried again', async ({ page }) => {
    await maraWithWrapUp(page, (wrapUp) => wrapUp.break('preview'));
    await page.goto(wrapUpUrl);
    const wrapUp = new WrapUpPage(page);

    await expect(wrapUp.failed).toContainText('We couldn’t open this');
    wrapUpOf(page).mend('preview');
    await wrapUp.tryAgain.click();

    await expect(wrapUp.heading).toHaveText('Wrap up Lakeside Weekend?');
  });
});
