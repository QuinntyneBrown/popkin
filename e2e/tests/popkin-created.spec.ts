import responses from '../fixtures/api/responses.json';
import { howLongForLakeside } from '../fixtures/journeys';
import { expect, test } from '../fixtures/pk-test';
import { scan } from '../fixtures/qr';
import { HowLongPage } from '../pages/how-long.page';
import { PopkinCreatedPage } from '../pages/popkin-created.page';

const created = responses['POST /api/popkins'].body;
const invite = responses[`GET /api/popkins/${created.id}/invite` as keyof typeof responses]
  .body as { url: string; code: string };

test.describe('the created screen', () => {
  // L2-010 AC1, AC6: popped up from How long, the Host gets the invite straight away
  test('reads "Pop! Lakeside Weekend is up." with the emoji in its colour, the QR code and the link', async ({
    page,
  }) => {
    await howLongForLakeside(page);
    await new HowLongPage(page).popItUp.click();

    const done = new PopkinCreatedPage(page);
    await expect(done.root).toBeVisible();
    await expect(done.heading).toHaveText('Pop! Lakeside Weekend is up.');
    await expect(done.tile).toHaveText('🏕️');
    await expect(done.screen).toHaveAttribute('data-accent', 'teal');
    await expect(done.qr).toHaveAccessibleName(`QR code for ${invite.url.replace('https://', '')}`);
    await expect(done.link).toHaveText(invite.url.replace('https://', ''));
  });

  // L2-011 AC6
  test('the QR code opens the invite link when it is scanned', async ({ page, pk }) => {
    await pk.open('popkinCreated');
    const done = new PopkinCreatedPage(page);

    expect(await scan(done.qr)).toBe(invite.url);
  });

  // L2-059 AC4
  test('the QR code is dark on white in the dark theme too', async ({ page, pk }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await pk.open('popkinCreated');
    const done = new PopkinCreatedPage(page);

    expect(await scan(done.qr)).toBe(invite.url);
  });

  // L2-010 AC2
  test('Copy link puts the link on the clipboard and reads Copied for 3 seconds, announced', async ({
    page,
    pk,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.clock.install();
    await pk.open('popkinCreated');
    const done = new PopkinCreatedPage(page);

    await done.copyLink.click();

    await expect(done.copyLink).toHaveText('Copied');
    await expect(done.status).toHaveText('Invite link copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(invite.url);
    await page.clock.runFor(3_000);
    await expect(done.copyLink).toHaveText('Copy link');
  });

  // L2-010 AC3
  test('Text it opens the messaging app with the link in the message', async ({ page, pk }) => {
    await pk.open('popkinCreated');
    const done = new PopkinCreatedPage(page);

    await expect(done.textIt).toHaveAttribute(
      'href',
      `sms:?&body=${encodeURIComponent(invite.url)}`,
    );
  });

  // L2-010 AC4
  test('Share opens the share sheet with the link', async ({ page, pk }) => {
    await page.addInitScript(() => {
      (window as unknown as { shared: unknown[] }).shared = [];
      navigator.share = async (data) => {
        (window as unknown as { shared: unknown[] }).shared.push(data);
      };
    });
    await pk.open('popkinCreated');
    const done = new PopkinCreatedPage(page);

    await done.share.click();

    const shared = await page.evaluate(
      () => (window as unknown as { shared: { url: string }[] }).shared,
    );
    expect(shared.map((s) => s.url)).toEqual([invite.url]);
  });

  test('Share is not shown on a device without a share sheet', async ({ page, pk }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'share', { value: undefined, configurable: true });
    });
    await pk.open('popkinCreated');
    const done = new PopkinCreatedPage(page);

    await expect(done.copyLink).toBeVisible();
    await expect(done.share).toHaveCount(0);
  });

  // L2-010 AC5
  test('Go to Lakeside Weekend opens the Popkin home', async ({ page, pk }) => {
    await pk.open('popkinCreated');
    const done = new PopkinCreatedPage(page);

    await expect(done.goTo).toHaveText('Go to Lakeside Weekend');
    await expect(done.goTo).toHaveAttribute('href', `/p/${created.id}`);
  });

  // L2-010 AC7, L2-060 AC1
  test('the confetti does not burst for someone who prefers reduced motion', async ({
    page,
    pk,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await pk.open('popkinCreated');
    const done = new PopkinCreatedPage(page);

    await expect(done.tile).toBeVisible();
    await expect(done.confetti.first()).toBeHidden();
  });

  test('the confetti bursts otherwise', async ({ page, pk }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await pk.open('popkinCreated');
    const done = new PopkinCreatedPage(page);

    await expect(done.confetti).toHaveCount(12);
    await expect(done.confetti.first()).toBeAttached();
  });
});
