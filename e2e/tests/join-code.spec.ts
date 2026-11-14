import { aCamera } from '../fixtures/camera';
import { aVisitorWithACode, holdTheLookup, joinCodeUrl, unknownCode } from '../fixtures/join-code';
import { asVisitor, inviteCode } from '../fixtures/journeys';
import { maraWithPopkins } from '../fixtures/my-popkins';
import { expect, test } from '../fixtures/pk-test';
import { JoinCodePage } from '../pages/join-code.page';
import { JoinInvitePage } from '../pages/join-invite.page';
import { MyPopkinsPage } from '../pages/my-popkins.page';
import { ScanToJoinDialog } from '../pages/scan-to-join.dialog';
import { WelcomePage } from '../pages/welcome.page';

// L2-015 AC5: a person without the link types its code or pastes it.
test.describe('Join with a code', () => {
  test('opens from "Join with a code" on the welcome screen', async ({ page, pk }) => {
    await asVisitor(page);
    await pk.open('welcome');

    await new WelcomePage(page).joinWithCode.click();

    const join = new JoinCodePage(page);
    await expect(page).toHaveURL('/join');
    await expect(join.root).toBeVisible();
    await expect(join.heading).toHaveText('Got a code?');
    await expect(join.lead).toHaveText('Type the code or paste the link from your invite.');
    await expect(join.code).toBeFocused();
    await expect(join.hint).toHaveText('The code is the last part of your invite link.');
    await expect(join.find).toHaveText('Find my Popkin');
    await expect(join.back).toHaveAttribute('href', '/welcome');
  });

  test('opens from "Type the code instead" in Scan to join', async ({ page }) => {
    await aCamera(page);
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();
    await popkins.scanToJoin.click();
    const scan = new ScanToJoinDialog(page);

    await scan.typeTheCode.click();

    await expect(scan.panel).toHaveCount(0);
    await expect(new JoinCodePage(page).root).toBeVisible();
  });

  test('offers "Scan a QR code instead", which opens Scan to join', async ({ page }) => {
    await asVisitor(page);
    await aCamera(page);
    await page.goto('/join');
    const join = new JoinCodePage(page);

    await join.scanInstead.click();

    const scan = new ScanToJoinDialog(page);
    await expect(scan.frame).toBeVisible();
    await scan.typeTheCode.click();
    await expect(scan.panel).toHaveCount(0);
    await expect(join.root).toBeVisible();
  });

  // L2-058 AC10
  test('is split from 768 px, with the photograph of sign up beside it', async ({ page }) => {
    await asVisitor(page);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/join');
    const join = new JoinCodePage(page);
    await expect(join.heading).toBeVisible();
    await expect(join.picture).toBeHidden();

    await page.setViewportSize({ width: 1024, height: 768 });

    await expect(join.picture).toBeVisible();
    await expect(join.code).toBeVisible();
  });

  // L2-015 AC5: a match opens that Popkin's invite.
  test('opens the invite of the code typed', async ({ page }) => {
    await aVisitorWithACode(page);
    await page.goto(joinCodeUrl);
    const join = new JoinCodePage(page);

    await join.code.fill(inviteCode.toUpperCase());
    await join.find.click();

    await expect(page).toHaveURL(`/i/${inviteCode}`);
    await expect(new JoinInvitePage(page).root).toBeVisible();
  });

  test('opens the invite of a link pasted, by pressing Enter', async ({ page, baseURL }) => {
    await aVisitorWithACode(page);
    await page.goto(joinCodeUrl);
    const join = new JoinCodePage(page);

    await join.code.fill(`  ${baseURL}/i/${inviteCode}  `);
    await join.code.press('Enter');

    await expect(page).toHaveURL(`/i/${inviteCode}`);
  });

  // L2-056 AC3
  test('reads "Finding your Popkin…" and cannot be sent twice while it looks', async ({ page }) => {
    await aVisitorWithACode(page);
    const release = await holdTheLookup(page);
    await page.goto(joinCodeUrl);
    const join = new JoinCodePage(page);
    await join.code.fill(inviteCode);

    await join.find.click();

    await expect(join.find).toHaveText('Finding your Popkin…');
    await expect(join.find).toBeDisabled();
    await expect(join.code).toHaveAttribute('readonly', '');
    release();
    await expect(page).toHaveURL(`/i/${inviteCode}`);
  });

  // L2-015 AC6
  test('marks the field when no Popkin has the code, and keeps what was typed', async ({
    page,
  }) => {
    await aVisitorWithACode(page);
    await page.goto(joinCodeUrl);
    const join = new JoinCodePage(page);
    await join.code.fill(unknownCode);

    await join.find.click();

    await expect(join.code).toHaveAttribute('aria-invalid', 'true');
    await expect(join.code).toHaveAccessibleDescription('We can’t find a Popkin with that code.');
    await expect(join.code).toHaveValue(unknownCode);
    await expect(page).toHaveURL(joinCodeUrl);
  });

  test('says the same of a link that is not a Popkin invite, without asking', async ({ page }) => {
    await aVisitorWithACode(page);
    const asked: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/invites/')) asked.push(request.url());
    });
    await page.goto(joinCodeUrl);
    const join = new JoinCodePage(page);
    await join.code.fill('https://example.com/party');

    await join.find.click();

    await expect(join.error).toHaveText('We can’t find a Popkin with that code.');
    await expect(join.code).toHaveValue('https://example.com/party');
    expect(asked).toEqual([]);
  });

  test('asks for the code or the link when nothing is typed', async ({ page }) => {
    await aVisitorWithACode(page);
    await page.goto(joinCodeUrl);
    const join = new JoinCodePage(page);

    await join.find.click();

    await expect(join.code).toHaveAttribute('aria-invalid', 'true');
    await expect(join.error).toHaveText('Type the code or paste the link from your invite.');
  });

  test('takes the mark away once the code is changed', async ({ page }) => {
    await aVisitorWithACode(page);
    await page.goto(joinCodeUrl);
    const join = new JoinCodePage(page);
    await join.code.fill(unknownCode);
    await join.find.click();
    await expect(join.error).toBeVisible();

    await join.code.fill(inviteCode);

    await expect(join.error).toHaveCount(0);
    await expect(join.hint).toBeVisible();
  });
});
