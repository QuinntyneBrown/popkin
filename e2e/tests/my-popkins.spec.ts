import { popkinId } from '../fixtures/chat';
import { maraAtHome } from '../fixtures/home';
import {
  buildWeekend,
  comeBackOnline,
  goOffline,
  lakeside,
  listKey,
  maraWithPopkins,
  noPopkins,
  someoneWritesIn,
  theActiveOnly,
  theListFailing,
  theListLoading,
  theMockList,
  thursday,
} from '../fixtures/my-popkins';
import { expect, test } from '../fixtures/pk-test';
import { answer } from '../fixtures/stubs';
import { MyPopkinsPage } from '../pages/my-popkins.page';
import { NotFoundPage } from '../pages/not-found.page';
import { OfflinePage } from '../pages/offline.page';
import { PopkinHomePage } from '../pages/popkin-home.page';

test.describe('My Popkins', () => {
  // L2-017 AC1
  test('shows each active Popkin as a card, the most recently active first', async ({ page }) => {
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await expect(popkins.heading).toHaveText('Your Popkins');
    await expect(popkins.cardNames).toHaveText([
      'Lakeside Weekend',
      'Thursday Night Group',
      'Tigers U9 Parents',
    ]);
    const card = popkins.card('Lakeside Weekend');
    await expect(card.root).toHaveAttribute('data-accent', 'teal');
    await expect(card.tile).toHaveText('🏕️');
    await expect(card.latest).toHaveText('Mara: last call for the canoe sign-up');
    await expect(card.avatars).toHaveCount(3);
    await expect(card.more).toHaveText('+11');
    await expect(card.members).toHaveText('14 members');
    await expect(card.foot).toContainText('1 day 6 hrs left');
  });

  // L2-017 AC1
  test('says Ongoing for a Popkin with no end, and the date for one far away', async ({ page }) => {
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await expect(popkins.card('Thursday Night Group').foot).toContainText('Ongoing');
    await expect(popkins.card('Tigers U9 Parents').foot).toContainText('Until Nov 30');
  });

  // L2-017 AC2
  test('a badge counts the unread messages and says what it counts', async ({ page }) => {
    await maraWithPopkins(page, {
      active: [lakeside, thursday, { ...theMockList.active[2], unreadCount: 140 }],
      wrappedUp: [],
    });
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await expect(popkins.card('Lakeside Weekend').badgeCount).toHaveText('3');
    await expect(popkins.card('Lakeside Weekend').badge).toContainText('3 unread messages');
    await expect(popkins.card('Thursday Night Group').badge).toHaveCount(0);
    await expect(popkins.card('Tigers U9 Parents').badgeCount).toHaveText('99+');
    await expect(popkins.card('Tigers U9 Parents').badge).toContainText(
      'More than 99 unread messages',
    );
  });

  // L2-027 AC3
  test('a message that arrives raises the badge and moves its Popkin first', async ({ page }) => {
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();
    await expect(popkins.cards).toHaveCount(3);

    await someoneWritesIn(page, thursday, 'Running ten minutes late');

    const card = popkins.card('Thursday Night Group');
    await expect(card.badgeCount).toHaveText('1');
    await expect(card.badge).toContainText('1 unread message');
    await expect(card.latest).toHaveText('Walt: Running ten minutes late');
    await expect(popkins.cardNames.first()).toHaveText('Thursday Night Group');
  });

  // L2-052: a message is text, never markup
  test('shows a message as text', async ({ page }) => {
    await maraWithPopkins(page, {
      active: [
        { ...lakeside, latestMessage: { firstName: 'Walt', text: '<b>hi</b> <img src=x>' } },
      ],
      wrappedUp: [],
    });
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await expect(popkins.card('Lakeside Weekend').latest).toHaveText('Walt: <b>hi</b> <img src=x>');
  });

  // L2-017 AC3
  test('choosing a card opens that Popkin’s home', async ({ page }) => {
    await maraAtHome(page);
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await popkins.card('Lakeside Weekend').root.click();

    await expect(new PopkinHomePage(page).root).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/p/${popkinId}$`));
  });

  test('a card is reached and opened with the keyboard', async ({ page }) => {
    await maraAtHome(page);
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await popkins.card('Lakeside Weekend').root.focus();
    await page.keyboard.press('Enter');

    await expect(new PopkinHomePage(page).root).toBeVisible();
  });

  // L2-017 AC4
  test('New Popkin opens Name your Popkin', async ({ page }) => {
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await expect(popkins.newPopkin).toHaveAttribute('href', '/new');
    await popkins.newPopkin.click();

    await expect(page).toHaveURL(/\/new$/);
  });

  // L2-017 AC5
  test('the avatar opens the account, and says whose it is', async ({ page }) => {
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await expect(popkins.account).toHaveAccessibleName('Your account, Mara Okafor');
    await expect(popkins.account).toHaveAttribute('href', '/account');
  });

  // L2-018 AC1, AC2
  test('lists the wrapped-up Popkins under the active ones, each opening its recap', async ({
    page,
  }) => {
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await expect(popkins.wrappedUpHeading).toBeVisible();
    await expect(popkins.wrappedUp).toHaveCount(2);
    const row = popkins.wrappedUpRow('Build Weekend ’26');
    await expect(row).toContainText('Wrapped Mar 8 · 48 people · 312 photos');
    await expect(row).toContainText('Recap');
    await expect(row).toHaveAttribute('href', `/p/${buildWeekend.id}/recap`);
  });

  // L2-018 AC3
  test('shows no Wrapped up section when nothing has wrapped up', async ({ page }) => {
    await maraWithPopkins(page, theActiveOnly);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await expect(popkins.cards).toHaveCount(3);
    await expect(popkins.wrappedUpHeading).toHaveCount(0);
  });

  test('shows only the Wrapped up section when nothing is active', async ({ page }) => {
    await maraWithPopkins(page, { active: [], wrappedUp: theMockList.wrappedUp });
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await expect(popkins.wrappedUp).toHaveCount(2);
    await expect(popkins.cards).toHaveCount(0);
    await expect(popkins.empty).toHaveCount(0);
  });

  // L2-017 AC6
  test('someone in no Popkin is told what one is and offered two ways in', async ({ page }) => {
    await maraWithPopkins(page, noPopkins);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await expect(popkins.empty).toContainText('No Popkins yet');
    await expect(popkins.empty).toContainText(
      'A Popkin is a private little home for one group: chat, photos, plans and calls. Start one, or scan a friend’s code to join theirs.',
    );
    await expect(popkins.startAPopkin).toHaveAttribute('href', '/new');
    await expect(popkins.emptyScanToJoin).toBeVisible();
  });

  // L2-017 AC7, L2-056 AC1
  test('while the list loads, skeleton cards show and assistive technology is told', async ({
    page,
  }) => {
    const release = await theListLoading(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await expect(popkins.loading).toBeAttached();
    await expect(popkins.skeletons.first()).toBeVisible();
    await expect(popkins.cards).toHaveCount(0);
    release();
    await expect(popkins.cards).toHaveCount(3);
    await expect(popkins.skeletons).toHaveCount(0);
  });

  // L2-056 AC2
  test('a list that did not load says so, keeps the header and reads again on Try again', async ({
    page,
  }) => {
    await theListFailing(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();

    await expect(popkins.error).toContainText(
      'They’re safe; we just couldn’t reach them. Check your connection and try again.',
    );
    await expect(popkins.account).toBeVisible();
    await answer(page, listKey, { status: 200, body: theMockList });
    await popkins.tryAgain.click();

    await expect(popkins.cards).toHaveCount(3);
  });
});

test.describe('My Popkins offline', () => {
  // L2-056 AC4
  test('shows what it saved last time under a banner that says so', async ({ page }) => {
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();
    await expect(popkins.cards).toHaveCount(3);
    await expect(popkins.offlineBanner).toHaveCount(0);

    await goOffline(page);

    await expect(popkins.offlineBanner).toHaveText(
      'You’re offline. Showing what we saved last time.',
    );
    await expect(popkins.cards).toHaveCount(3);
  });

  // L2-056 AC4
  test('opened again offline, it shows the saved list', async ({ page }) => {
    await maraAtHome(page);
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();
    await expect(popkins.cards).toHaveCount(3);
    await popkins.card('Lakeside Weekend').root.click();
    await expect(new PopkinHomePage(page).root).toBeVisible();
    await goOffline(page);

    await page.goBack();

    await expect(popkins.offlineBanner).toBeVisible();
    await expect(popkins.cardNames).toHaveText([
      'Lakeside Weekend',
      'Thursday Night Group',
      'Tigers U9 Parents',
    ]);
  });

  test('the list is read again when the connection returns', async ({ page }) => {
    await maraWithPopkins(page);
    const popkins = new MyPopkinsPage(page);
    await popkins.open();
    await expect(popkins.cards).toHaveCount(3);
    await goOffline(page);
    await expect(popkins.offlineBanner).toBeVisible();

    await comeBackOnline(page, theActiveOnly);

    await expect(popkins.offlineBanner).toHaveCount(0);
    await expect(popkins.wrappedUpHeading).toHaveCount(0);
  });

  // L2-056 AC4
  test('with nothing saved, the offline screen says it needs a connection', async ({ page }) => {
    await maraWithPopkins(page);
    await page.goto('/nowhere');
    const notFound = new NotFoundPage(page);
    await expect(notFound.root).toBeVisible();
    await goOffline(page);

    await notFound.myPopkins.click();

    const offline = new OfflinePage(page);
    await expect(offline.heading).toHaveText('You’re offline');
  });
});
