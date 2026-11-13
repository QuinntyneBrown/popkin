import path from 'node:path';
import {
  asVisitor,
  joelAtTheMockInvite,
  joelSignsUp,
  joinFromTheInvite,
  lakesideCast,
  theMockInvite,
  theMockWrappedInvite,
} from '../../../e2e/fixtures/journeys';
import { test } from '../../../e2e/fixtures/pk-test';
import { answer, problem } from '../../../e2e/fixtures/stubs';
import { JoinInvitePage } from '../../../e2e/pages/join-invite.page';
import { SignUpPage } from '../../../e2e/pages/sign-up.page';
import { VerifyCodePage } from '../../../e2e/pages/verify-code.page';
import { YourProfilePage } from '../../../e2e/pages/your-profile.page';
import { YoureInPage } from '../../../e2e/pages/youre-in.page';
import { SIZES, detail, frame, shot, type Size } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 02: journey 2, Join by invite, in the running app. Every /api request
 * is answered from the recording or a stub of `e2e/fixtures/journeys.ts` (ADR 0005). Not a test
 * and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/02-journey-02-join-by-invite` runs it.
 */
const sizes = Object.keys(SIZES) as Size[];
const portrait = path.join(__dirname, '../../mocks/assets/images/call3.jpg');
const blur = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

test('the invite at every form factor, and in the dark', async ({ page, pk }) => {
  await theMockInvite(page);
  const invite = new JoinInvitePage(page);
  for (const size of sizes) {
    await frame(page, size);
    await pk.open('joinInvite');
    await invite.join.waitFor();
    await shot(page, `invite-${size.toLowerCase()}`);
    if (size === 'XS') {
      await detail(invite.preview, 'invite-preview', 20);
      await detail(invite.invitedBy, 'invite-pill', 14);
      await detail(invite.avatarStack, 'invite-avatars', 6);
      await detail(invite.timeLeft, 'invite-time', 10);
    }
  }
  await frame(page, 'XS', 'dark');
  await pk.open('joinInvite');
  await invite.join.waitFor();
  await shot(page, 'invite-xs-dark');
});

test('Join takes a visitor through sign up', async ({ page, pk }) => {
  await frame(page, 'XS');
  await asVisitor(page);
  await lakesideCast(page);
  await joelSignsUp(page);
  await pk.open('joinInvite');
  await new JoinInvitePage(page).join.click();
  const signUp = new SignUpPage(page);
  await signUp.fill('Joel', '(415) 555-0123');
  await blur(page);
  await shot(page, 'sign-up-xs');
  await signUp.submit();
  const verify = new VerifyCodePage(page);
  // Five of the six digits: the sixth would confirm the code and leave the screen.
  await verify.code.pressSequentially('48291');
  await shot(page, 'code-xs');
  await detail(verify.codeField, 'code-field', 20);
});

test('the profile step at every form factor, and a photo', async ({ page, pk }) => {
  await joelAtTheMockInvite(page);
  const profile = new YourProfilePage(page);
  for (const size of sizes) {
    await frame(page, size);
    await pk.open('yourProfile');
    await profile.imIn.waitFor();
    if (size !== 'XS') await profile.people.first().waitFor();
    await blur(page);
    await shot(page, `profile-${size.toLowerCase()}`);
    if (size === 'XL') await detail(profile.picture, 'profile-aside', 0);
  }

  await frame(page, 'XS');
  await pk.open('yourProfile');
  await profile.imIn.waitFor();
  await blur(page);
  await detail(profile.photo, 'photo-initial', 56);

  await profile.choosePhoto({
    name: 'notes.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7'),
  });
  await profile.photoError.waitFor();
  await blur(page);
  await shot(page, 'profile-refused-xs');
  await detail(profile.photoError, 'photo-refused', 10);

  await pk.open('yourProfile');
  await profile.choosePhoto(portrait);
  await profile.photoPreview.waitFor();
  await blur(page);
  await shot(page, 'profile-photo-xs');
  await detail(profile.photo, 'photo-chosen', 56);
});

test('the welcome at every form factor, and in the dark', async ({ page, pk }) => {
  await frame(page, 'XS');
  await joelAtTheMockInvite(page);
  await pk.open('joinInvite');
  // The welcome is reached by joining in this page session; the window then changes in place.
  await joinFromTheInvite(page);
  const welcome = new YoureInPage(page);
  for (const size of sizes) {
    await frame(page, size);
    await welcome.heading.waitFor();
    await shot(page, `welcome-${size.toLowerCase()}`);
    if (size === 'XS') {
      await detail(welcome.arrival, 'welcome-arrival', 16);
      await detail(welcome.sayHi, 'welcome-say-hi', 6);
      await detail(welcome.seeThePhotos, 'welcome-see-photos', 6);
    }
  }
  await frame(page, 'XS', 'dark');
  await shot(page, 'welcome-xs-dark');
  await frame(page, 'XL', 'dark');
  await shot(page, 'welcome-xl-dark');
});

test('invites that cannot be joined', async ({ page, pk }) => {
  await theMockWrappedInvite(page);
  const invite = new JoinInvitePage(page);
  await frame(page, 'XS');
  await pk.open('joinInviteWrapped');
  await invite.startYourOwn.waitFor();
  await shot(page, 'wrapped-xs');
  await detail(invite.wrappedLine, 'wrapped-line', 8);
  await frame(page, 'XL');
  await pk.open('joinInviteWrapped');
  await invite.startYourOwn.waitFor();
  await shot(page, 'wrapped-xl');

  // A code that matches no Popkin, answered as the API answers it (L2-016 AC2).
  await answer(page, 'GET /api/invites/nosuchcode', problem(404, 'invite_not_found'));
  await frame(page, 'XS');
  await pk.open('joinInviteNotFound');
  await invite.emptyState.waitFor();
  await shot(page, 'not-found-xs');
  await detail(invite.emptyState, 'not-found', 16);
});
