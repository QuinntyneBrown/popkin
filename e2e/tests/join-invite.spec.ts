import responses from '../fixtures/api/responses.json';
import {
  asJoel,
  asMemberOfLakeside,
  asVisitor,
  joelSignsUp,
  inviteCode,
  lakesideCast,
  mockToday,
  previewKey,
  wrappedUpInvite,
} from '../fixtures/journeys';
import { expect, test } from '../fixtures/pk-test';
import { answer, answerOnce, failNetwork, hold, problem } from '../fixtures/stubs';
import { JoinInvitePage } from '../pages/join-invite.page';
import { SignUpPage } from '../pages/sign-up.page';
import { VerifyCodePage } from '../pages/verify-code.page';
import { YourProfilePage } from '../pages/your-profile.page';
import { YoureInPage } from '../pages/youre-in.page';

const created = responses['POST /api/popkins'].body;

test.describe('an invite to an active Popkin', () => {
  // L2-012 AC1
  test('shows who invited you, the Popkin, its people, when it wraps up and Join', async ({
    page,
    pk,
  }) => {
    await page.clock.install({ time: mockToday });
    await asVisitor(page);
    await lakesideCast(page);
    await pk.open('joinInvite');
    const invite = new JoinInvitePage(page);

    await expect(invite.root).toBeVisible();
    await expect(invite.invitedBy).toHaveText('Mara invited you');
    await expect(invite.tile).toHaveText('🏕️');
    await expect(invite.screen).toHaveAttribute('data-accent', 'teal');
    await expect(invite.heading).toHaveText('Lakeside Weekend');
    await expect(invite.avatars).toHaveCount(5);
    await expect(invite.moreAvatars).toHaveText('+9');
    await expect(invite.people).toHaveText('14 people');
    await expect(invite.timeLeft).toHaveText('Here until Sunday, 6 pm');
    await expect(invite.join).toBeVisible();
    await expect(invite.note).toHaveText('Free, no app to download.');
  });

  test('counts the people of the recorded Popkin, with no "+" when every avatar shows', async ({
    page,
    pk,
  }) => {
    await asVisitor(page);
    await pk.open('joinInvite');
    const invite = new JoinInvitePage(page);

    await expect(invite.heading).toHaveText('Lakeside Weekend');
    await expect(invite.people).toHaveText('3 people');
    await expect(invite.avatars).toHaveText(['MO', 'WB', 'DP']);
    await expect(invite.moreAvatars).toHaveCount(0);
  });

  // L2-012 AC2
  test('shows no end time for a Popkin that keeps going', async ({ page, pk }) => {
    await asVisitor(page);
    await lakesideCast(page, { endsAt: null });
    await pk.open('joinInvite');
    const invite = new JoinInvitePage(page);

    await expect(invite.join).toBeVisible();
    await expect(invite.timeLeft).toHaveCount(0);
  });

  // L2-052 AC2
  test('shows a name that holds markup as text', async ({ page, pk }) => {
    await asVisitor(page);
    await lakesideCast(page, { name: '<b>Lakeside</b> <img src=x onerror=alert(1)>' });
    await pk.open('joinInvite');
    const invite = new JoinInvitePage(page);

    await expect(invite.heading).toHaveText('<b>Lakeside</b> <img src=x onerror=alert(1)>');
    await expect(invite.headingMarkup).toHaveCount(0);
  });

  // L2-056 AC1
  test('says it is loading, with skeletons hidden from assistive technology, until the invite arrives', async ({
    page,
    pk,
  }) => {
    await asVisitor(page);
    const release = await hold(page, previewKey);
    await pk.open('joinInvite');
    const invite = new JoinInvitePage(page);

    await expect(invite.loading).toHaveText('Loading your invite…');
    await expect(invite.heading).toHaveText('Your invite');
    await expect(invite.skeletons.first()).toBeVisible();
    await expect(invite.hiddenSkeletons).toHaveCount(4);
    await expect(invite.join).toHaveCount(0);

    release();

    await expect(invite.heading).toHaveText('Lakeside Weekend');
    await expect(invite.skeletons).toHaveCount(0);
  });

  // L2-012 AC3: a signed-in person goes straight to the profile step
  test('Join takes a signed-in person to the profile step', async ({ page, pk }) => {
    await asJoel(page);
    await pk.open('joinInvite');
    const invite = new JoinInvitePage(page);

    await invite.join.click();

    await expect(page).toHaveURL(`/i/${inviteCode}/profile`);
  });

  // L2-012 AC3, L2-013, L2-014 AC1: the whole way in, from a link to the welcome
  test('Join takes a visitor through sign up and the profile step to the welcome', async ({
    page,
    pk,
  }) => {
    await asVisitor(page);
    await joelSignsUp(page);
    await pk.open('joinInvite');

    await new JoinInvitePage(page).join.click();

    await expect(page).toHaveURL(
      `/sign-up?returnUrl=${encodeURIComponent(`/i/${inviteCode}/profile`)}`,
    );
    const signUp = new SignUpPage(page);
    await signUp.fill('Joel', '(415) 555-0123');
    await signUp.submit();
    await new VerifyCodePage(page).type('482913');

    await expect(page).toHaveURL(`/i/${inviteCode}/profile`);
    const profile = new YourProfilePage(page);
    await expect(profile.name).toHaveValue('Joel');
    await profile.imIn.click();

    await expect(new YoureInPage(page).heading).toHaveText('Welcome in, Joel!');
  });

  // L2-012 AC4
  test('opens the Popkin home for someone who is already a member', async ({ page, pk }) => {
    await asMemberOfLakeside(page);
    await pk.open('joinInvite');

    await expect(page).toHaveURL(`/p/${created.id}`);
  });
});

test.describe('an invite that cannot be joined', () => {
  // L2-016 AC1
  test('to a wrapped-up Popkin says so, names who to ask and offers no Join', async ({
    page,
    pk,
  }) => {
    await page.clock.install({ time: mockToday });
    await asVisitor(page);
    await wrappedUpInvite(page);
    await pk.open('joinInvite');
    const invite = new JoinInvitePage(page);

    await expect(invite.mutedTile).toHaveText('🏕️');
    await expect(invite.heading).toHaveText('Lakeside Weekend');
    await expect(invite.people).toHaveText('14 people');
    await expect(invite.wrappedLine).toHaveText(
      'This Popkin wrapped up on Sunday. What a time. Ask Mara for the next one.',
    );
    await expect(invite.join).toHaveCount(0);
    await expect(invite.timeLeft).toHaveCount(0);
    await expect(invite.startYourOwn).toHaveAttribute('href', '/sign-up');
  });

  test('Start your own Popkin takes a signed-in person to name one', async ({ page, pk }) => {
    await asJoel(page);
    await wrappedUpInvite(page);
    await pk.open('joinInvite');
    const invite = new JoinInvitePage(page);

    await expect(invite.startYourOwn).toHaveAttribute('href', '/new');
  });

  // L2-016 AC2
  test('that matches no Popkin says so and offers Start a Popkin and Join with a code', async ({
    page,
    pk,
  }) => {
    await asVisitor(page);
    await answer(page, 'GET /api/invites/nosuchcode', problem(404, 'invite_not_found'));
    await pk.open('joinInviteNotFound');
    const invite = new JoinInvitePage(page);

    await expect(invite.heading).toHaveText('We can’t find that invite');
    await expect(invite.problemText).toHaveText(
      'The link may be mistyped, or the Popkin may be gone. Ask whoever sent it for a fresh one.',
    );
    await expect(invite.startAPopkin).toHaveAttribute('href', '/sign-up');
    await expect(invite.joinWithACode).toHaveAttribute('href', '/join');
    await expect(invite.join).toHaveCount(0);
  });

  // L2-056 AC2
  test('that fails to load says what happened; Try again loads it', async ({ page, pk }) => {
    await asVisitor(page);
    await answerOnce(page, previewKey, problem(500, 'server_error'));
    await pk.open('joinInvite');
    const invite = new JoinInvitePage(page);

    await expect(invite.problem).toContainText('We couldn’t open your invite');
    await expect(invite.problem).toContainText(
      'Your connection dropped or we slipped up. The invite itself is fine.',
    );
    await expect(invite.heading).toHaveText('Your invite');
    await expect(invite.backToStart).toHaveAttribute('href', '/welcome');

    await invite.tryAgain.click();

    await expect(invite.heading).toHaveText('Lakeside Weekend');
    await expect(invite.problem).toHaveCount(0);
  });

  test('says the same when the device is offline', async ({ page, pk }) => {
    await asVisitor(page);
    await failNetwork(page, previewKey);
    await pk.open('joinInvite');
    const invite = new JoinInvitePage(page);

    await expect(invite.problem).toContainText('We couldn’t open your invite');
    await expect(invite.tryAgain).toBeVisible();
  });

  // L2-053 AC4
  test('says when to try again after too many codes were tried', async ({ page, pk }) => {
    await asVisitor(page);
    await answer(page, previewKey, problem(429, 'rate_limited', { retryAfterSeconds: 300 }));
    await pk.open('joinInvite');
    const invite = new JoinInvitePage(page);

    await expect(invite.heading).toHaveText('That’s a lot of invites');
    await expect(invite.problemText).toHaveText('Try again in 5 minutes.');
    await expect(invite.join).toHaveCount(0);
  });
});

test.describe('the invite screen on a wider screen', () => {
  // L2-058 AC10, AC13
  test('from 768 px a picture sits beside the invite; Join stays in reach', async ({
    page,
    pk,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await asVisitor(page);
    await pk.open('joinInvite');
    const invite = new JoinInvitePage(page);

    await expect(invite.picture).toBeVisible();
    await expect(invite.heading).toHaveText('Lakeside Weekend');
    await expect(invite.join).toBeVisible();
  });

  // L2-058 AC2, AC13
  test('on a phone the invite is one column with no picture', async ({ page, pk }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await asVisitor(page);
    await pk.open('joinInvite');
    const invite = new JoinInvitePage(page);

    await expect(invite.heading).toHaveText('Lakeside Weekend');
    await expect(invite.picture).toHaveCount(0);
    await expect(invite.join).toBeInViewport();
  });
});
