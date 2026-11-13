import {
  codeScreenAt24Seconds,
  howLongForLakeside,
  withShareSheet,
} from '../../../e2e/fixtures/journeys';
import { test } from '../../../e2e/fixtures/pk-test';
import { HowLongPage } from '../../../e2e/pages/how-long.page';
import { NameYourPopkinPage } from '../../../e2e/pages/name-your-popkin.page';
import { PopkinCreatedPage } from '../../../e2e/pages/popkin-created.page';
import { SignUpPage } from '../../../e2e/pages/sign-up.page';
import { VerifyCodePage } from '../../../e2e/pages/verify-code.page';
import { SIZES, detail, frame, shot, type Size } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 01: journey 1, Start a Popkin, in the running app. Every /api request
 * is answered from the recording (ADR 0005). Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/01-journey-01-start-a-popkin` runs it.
 */
const sizes = Object.keys(SIZES) as Size[];

test('sign up at every form factor', async ({ page, pk }) => {
  for (const size of sizes) {
    await frame(page, size);
    await pk.open('signUp');
    await new SignUpPage(page).fill('Mara', '(415) 555-0148');
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await shot(page, `sign-up-${size.toLowerCase()}`);
  }
});

test('the code screen', async ({ page }) => {
  await frame(page, 'XS');
  await codeScreenAt24Seconds(page);
  const verify = new VerifyCodePage(page);
  // Five of the six digits: the sixth would confirm the code and leave the screen.
  await verify.code.pressSequentially('48291');
  await shot(page, 'code-xs');
  await detail(verify.codeField, 'code-field', 20);
});

test('name your Popkin, with the preview following', async ({ page, pk }) => {
  await frame(page, 'XL');
  await pk.open('nameYourPopkin');
  const step = new NameYourPopkinPage(page);
  await detail(step.previewCard, 'preview-blank', 28);

  await step.name.fill('Thursday Night Crew');
  await step.emojiNamed('Guitar').click();
  await step.colour('Berry').click();
  await detail(step.previewCard, 'preview-crew', 28);

  await step.chooseLakeside();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await shot(page, 'name-xl');
  await detail(step.previewCard, 'preview-lakeside', 28);

  await frame(page, 'XS');
  await shot(page, 'name-xs');
});

test('how long it lasts', async ({ page }) => {
  await frame(page, 'M');
  await howLongForLakeside(page);
  const step = new HowLongPage(page);
  await shot(page, 'how-long-m');
  await detail(step.timeline, 'timeline-weekend', 28);
  await step.option('Keep it going').click();
  await detail(step.timeline, 'timeline-forever', 28);
});

test('the created screen, light and dark', async ({ page, pk }) => {
  await withShareSheet(page);
  await frame(page, 'XL');
  await pk.open('popkinCreated');
  const done = new PopkinCreatedPage(page);
  await done.heading.waitFor();
  await shot(page, 'created-xl');
  await detail(done.qrCard, 'qr-card', 24);

  await frame(page, 'XS');
  await shot(page, 'created-xs');

  await frame(page, 'XS', 'dark');
  await pk.open('popkinCreated');
  await done.heading.waitFor();
  await shot(page, 'created-xs-dark');

  await frame(page, 'XL', 'dark');
  await pk.open('popkinCreated');
  await done.heading.waitFor();
  await shot(page, 'created-xl-dark');
});
