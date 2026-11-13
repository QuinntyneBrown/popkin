import type { Locator, Page } from '@playwright/test';
import responses from '../../../e2e/fixtures/api/responses.json';
import { codeSentAt } from '../../../e2e/fixtures/journeys';
import {
  openTheScanner,
  scanAPopkinAndWait,
  scanSomethingElse,
  someoneWritesIn,
  theMockPopkins,
  thePopkinsEmpty,
  thePopkinsFailing,
  thePopkinsGoOffline,
  thePopkinsLoading,
  thursday,
  withACamera,
} from '../../../e2e/fixtures/my-popkins';
import { test } from '../../../e2e/fixtures/pk-test';
import { answerOnce } from '../../../e2e/fixtures/stubs';
import { MyPopkinsPage } from '../../../e2e/pages/my-popkins.page';
import { OfflinePage } from '../../../e2e/pages/offline.page';
import { ScanToJoinDialog } from '../../../e2e/pages/scan-to-join.dialog';
import { SignInPage } from '../../../e2e/pages/sign-in.page';
import { VerifyCodePage } from '../../../e2e/pages/verify-code.page';
import { detail, frame, shot } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 06: journey 6, Come back, in the running app. Every /api request is
 * answered by the list stub of `e2e/fixtures/my-popkins.ts` or the recording, the hub by
 * `e2e/fixtures/hub.ts` and the camera by `e2e/fixtures/camera.ts` (ADR 0005, ADR 0010); no
 * backend and no camera ran. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/06-journey-06-come-back` runs it.
 */
const confirmKey = `POST /api/auth/codes/${responses['POST /api/auth/codes'].body.verificationId}/confirm`;

const closeUp = (region: Locator, name: string, pad = 12) => detail(region, name, pad);

/** Waits until every picture on the page has arrived. */
async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

/** 640 px, where the cards go two across: between the phone and the tablet of `SIZES`. */
async function frameAt640(page: Page): Promise<void> {
  await page.setViewportSize({ width: 640, height: 900 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
}

/** Opens My Popkins and waits until its three cards and their faces are drawn. */
async function open(page: Page): Promise<MyPopkinsPage> {
  const popkins = new MyPopkinsPage(page);
  await popkins.open();
  await popkins.cards.nth(2).waitFor();
  await pictures(page);
  return popkins;
}

test('sign in on a phone and at 1440 px, and an email that is not right', async ({ page }) => {
  const signIn = new SignInPage(page);
  for (const size of ['XS', 'XL'] as const) {
    await frame(page, size);
    await signIn.open();
    await signIn.contact.fill('(415) 555-0148');
    await signIn.contact.blur();
    await pictures(page);
    await shot(page, `sign-in-${size.toLowerCase()}`);
    if (size === 'XS') {
      await closeUp(signIn.contactField, 'sign-in-field', 10);
      await closeUp(signIn.primaryButton, 'sign-in-button', 12);
    }
  }
  await frame(page, 'XS');
  await signIn.open();
  await signIn.contact.fill('mara@hey');
  await signIn.send.click();
  await signIn.contactError.waitFor();
  await shot(page, 'sign-in-invalid-xs');
  await closeUp(signIn.contactField, 'sign-in-invalid-field', 10);
});

test('the code screen', async ({ page }) => {
  // The device's clock is the moment the recorded code was sent, so the wait reads 0:30.
  await page.clock.install({ time: codeSentAt });
  await frame(page, 'XS');
  const verify = new VerifyCodePage(page);
  await verify.reachBySignIn();
  await shot(page, 'code-xs');
  await closeUp(verify.codeField, 'code-field', 10);
});

test('the right code opens My Popkins', async ({ page }) => {
  await theMockPopkins(page);
  await frame(page, 'XS');
  const verify = new VerifyCodePage(page);
  await verify.reachBySignIn();
  await verify.type('482913');
  const popkins = new MyPopkinsPage(page);
  await popkins.root.waitFor();
  await popkins.cards.nth(2).waitFor();
  await pictures(page);
  await shot(page, 'after-code-xs');
});

test('My Popkins from 390 to 1024 px, and in the dark', async ({ page }) => {
  await theMockPopkins(page);
  for (const size of ['XS', 'M', 'L'] as const) {
    await frame(page, size);
    const popkins = await open(page);
    await shot(page, `popkins-${size.toLowerCase()}`);
    if (size === 'XS') {
      await closeUp(popkins.fab, 'new-floating', 14);
      await closeUp(popkins.card('Lakeside Weekend').root, 'card-lakeside', 10);
      await closeUp(popkins.card('Thursday Night Group').root, 'card-thursday', 10);
      await closeUp(popkins.card('Tigers U9 Parents').root, 'card-tigers', 10);
      await closeUp(popkins.card('Lakeside Weekend').foot, 'foot-lakeside', 8);
      await closeUp(popkins.card('Thursday Night Group').foot, 'foot-thursday', 8);
      await closeUp(popkins.card('Tigers U9 Parents').foot, 'foot-tigers', 8);
      // At the end of the list, "New Popkin" floats below the last wrapped-up Popkin.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await closeUp(popkins.wrappedUpList, 'wrapped-up', 10);
    }
    if (size === 'M') await closeUp(popkins.headerNewPopkin, 'new-in-header', 14);
  }
  await frameAt640(page);
  await open(page);
  await shot(page, 'popkins-640');

  await frame(page, 'XS', 'dark');
  await open(page);
  await shot(page, 'popkins-xs-dark');
});

test('a message arrives: the badge goes up and the card moves first', async ({ page }) => {
  await theMockPopkins(page);
  await frame(page, 'XS');
  const popkins = await open(page);
  await shot(page, 'live-before-xs');

  await someoneWritesIn(page, thursday, 'Running ten minutes late');
  await popkins.cardNames.first().filter({ hasText: 'Thursday Night Group' }).waitFor();
  await popkins.card('Thursday Night Group').badge.waitFor();
  await pictures(page);
  await shot(page, 'live-after-xs');
  await closeUp(popkins.card('Thursday Night Group').root, 'live-card', 10);
});

test('no account yet: a name after the code, then No Popkins yet', async ({ page }) => {
  await thePopkinsEmpty(page);
  await answerOnce(page, confirmKey, {
    status: 200,
    body: { outcome: 'NameRequired', session: null, isNewPerson: true },
  });
  await frame(page, 'XS');
  const verify = new VerifyCodePage(page);
  await verify.reachBySignIn();
  await verify.type('482913');
  await verify.name.waitFor();
  await verify.name.fill('Mara');
  await verify.name.blur();
  await shot(page, 'name-xs');
  await closeUp(verify.heading, 'name-heading', 12);

  await verify.continue.click();
  const popkins = new MyPopkinsPage(page);
  await popkins.empty.waitFor();
  await pictures(page);
  await shot(page, 'empty-xs');
});

test('Scan to join: the camera', async ({ page }) => {
  await withACamera('allowed')(page);
  await frame(page, 'XS');
  await open(page);
  await openTheScanner(page);
  const scan = new ScanToJoinDialog(page);
  await scan.frame.waitFor();
  await shot(page, 'scan-xs');

});

test('Scan to join: another QR code', async ({ page }) => {
  await withACamera('allowed')(page);
  await frame(page, 'XS');
  await open(page);
  await scanSomethingElse(page);
  const scan = new ScanToJoinDialog(page);
  await shot(page, 'scan-other-xs');
  await closeUp(scan.alert, 'scan-other-alert', 8);
});

test('Scan to join: a Popkin’s code is found', async ({ page }) => {
  await withACamera('allowed')(page);
  await frame(page, 'XS');
  await open(page);
  await scanAPopkinAndWait(page);
  const scan = new ScanToJoinDialog(page);
  await shot(page, 'scan-found-xs');
  await closeUp(scan.hint, 'scan-found-hint', 12);
});

test('Scan to join: the camera is refused', async ({ page }) => {
  await withACamera('denied')(page);
  await frame(page, 'XS');
  await open(page);
  await openTheScanner(page);
  const scan = new ScanToJoinDialog(page);
  await scan.tryTheCamera.waitFor();
  await shot(page, 'scan-denied-xs');
  await closeUp(scan.body, 'scan-denied-body', 0);
  await closeUp(scan.footer, 'scan-denied-footer', 0);
});

test('the list loading', async ({ page }) => {
  await thePopkinsLoading(page);
  await frame(page, 'XS');
  const popkins = new MyPopkinsPage(page);
  await popkins.open();
  await popkins.skeletons.first().waitFor();
  await shot(page, 'loading-xs');
});

test('the list that did not load', async ({ page }) => {
  await thePopkinsFailing(page);
  await frame(page, 'XS');
  const popkins = new MyPopkinsPage(page);
  await popkins.open();
  await popkins.error.waitFor();
  await popkins.tryAgain.waitFor();
  await shot(page, 'error-xs');
});

test('offline: the banner over the saved list, and the offline screen', async ({ page }) => {
  await theMockPopkins(page);
  await frame(page, 'XS');
  const popkins = await open(page);
  await thePopkinsGoOffline(page);
  await shot(page, 'offline-banner-xs');
  await closeUp(popkins.offlineBanner, 'offline-banner', 8);
  await page.context().setOffline(false);

  const offline = new OfflinePage(page);
  await page.goto('/offline');
  await offline.root.waitFor();
  await offline.heading.waitFor();
  await shot(page, 'offline-xs');
});
