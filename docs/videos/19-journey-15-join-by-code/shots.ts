import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { aCamera } from '../../../e2e/fixtures/camera';
import {
  aVisitorWithACode,
  holdTheLookup,
  joinCodeUrl,
  theLookupFails,
  tooManyTries,
  typedCode,
  unknownCode,
} from '../../../e2e/fixtures/join-code';
import { asVisitor, inviteCode } from '../../../e2e/fixtures/journeys';
import { test } from '../../../e2e/fixtures/pk-test';
import { JoinCodePage } from '../../../e2e/pages/join-code.page';
import { JoinInvitePage } from '../../../e2e/pages/join-invite.page';
import { ScanToJoinDialog } from '../../../e2e/pages/scan-to-join.dialog';
import { WelcomePage } from '../../../e2e/pages/welcome.page';
import { detail, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 19: journey 15, Join by code, in the running app. A visitor without
 * the link opens "Got a code?" from the welcome screen and types the code; the invite lookup is
 * answered from the recording, or held, refused or failing by `e2e/fixtures/join-code.ts`. Every
 * /api request is answered in memory by the fixtures of `e2e/` (ADR 0005); no backend and no
 * database ran. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/19-journey-15-join-by-code` runs it.
 */

const lower = (size: Size) => size.toLowerCase();
const SIZES = ['XS', 'M', 'L', 'XL'] as const satisfies readonly Size[];

/** Waits until every picture on the page has arrived. */
async function pictures(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

/** A visitor at "Got a code?", at a size and a theme. */
async function joinAt(page: Page, size: Size, theme: Theme = 'light') {
  await frame(page, size, theme);
  await page.goto(joinCodeUrl);
  const join = new JoinCodePage(page);
  await expect(join.heading).toHaveText('Got a code?');
  await pictures(page);
  return join;
}

for (const theme of ['light', 'dark'] as const) {
  test(`Got a code?, ${theme}`, async ({ page }) => {
    await aVisitorWithACode(page);
    const join = await joinAt(page, 'XS', theme);
    await join.code.blur();
    await shot(page, `join-xs${theme === 'dark' ? '-dark' : ''}`);
  });
}

test('from the welcome screen and from Scan to join', async ({ page }) => {
  await asVisitor(page);
  await aCamera(page);
  await frame(page, 'XS');
  await page.goto('/welcome');
  const welcome = new WelcomePage(page);
  await expect(welcome.joinWithCode).toBeVisible();
  await pictures(page);
  await shot(page, 'welcome-xs');
  await detail(welcome.actions, 'welcome-actions', 12);
  await welcome.joinWithCode.click();
  const join = new JoinCodePage(page);
  await expect(join.code).toBeFocused();
  await join.scanInstead.click();
  const scan = new ScanToJoinDialog(page);
  await expect(scan.frame).toBeVisible();
  await page.mouse.move(0, 0);
  await shot(page, 'scan-xs');
});

test('the code typed opens the invite', async ({ page }) => {
  await aVisitorWithACode(page);
  const release = await holdTheLookup(page);
  const join = await joinAt(page, 'XS');
  await join.code.fill(inviteCode);
  await join.code.blur();
  await page.mouse.move(0, 0);
  await shot(page, 'typed-xs');
  await detail(join.field, 'typed-field', 12);
  await join.find.click();
  await expect(join.find).toHaveText('Finding your Popkin…');
  await page.mouse.move(0, 0);
  await detail(join.find, 'finding', 16);
  release();
  await expect(page).toHaveURL(`/i/${inviteCode}`);
  const invite = new JoinInvitePage(page);
  await expect(invite.primaryButton).toBeVisible();
  await pictures(page);
  await shot(page, 'invite-xs');
});

test('a code no Popkin has', async ({ page }) => {
  await aVisitorWithACode(page);
  const join = await joinAt(page, 'XS');
  await join.code.fill(unknownCode);
  await join.find.click();
  await expect(join.error).toHaveText('We can’t find a Popkin with that code.');
  await join.code.blur();
  await page.mouse.move(0, 0);
  await detail(join.field, 'invalid-field', 12);
});

test('too many tries', async ({ page }) => {
  await aVisitorWithACode(page);
  await tooManyTries(page, 540, typedCode);
  const join = await joinAt(page, 'XS');
  await join.code.fill(typedCode);
  await join.find.click();
  await expect(join.alert).toContainText('Try again in 9 minutes.');
  await join.code.blur();
  await page.mouse.move(0, 0);
  await shot(page, 'limited-xs');
  await detail(join.alert, 'limited-alert', 12);
});

test('a lookup that fails', async ({ page }) => {
  await aVisitorWithACode(page);
  await theLookupFails(page, typedCode);
  const join = await joinAt(page, 'XS');
  await join.code.fill(typedCode);
  await join.find.click();
  await expect(join.alert).toContainText('We couldn’t look that up.');
  await join.code.blur();
  await page.mouse.move(0, 0);
  await detail(join.alert, 'error-alert', 12);
});

for (const size of SIZES) {
  test(`Got a code? at ${size}`, async ({ page }) => {
    await aVisitorWithACode(page);
    const join = await joinAt(page, size);
    await join.code.blur();
    await shot(page, `join-${lower(size)}`);
  });
}
